"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { RefreshCwIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { CheckDomainAvailabilityResult } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { PurchaseDomainsDialog, type PurchaseDomainRow } from "@/features/domains/purchase-domains-dialog";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

type Candidate = { fqdn: string; selected: boolean; availability?: CheckDomainAvailabilityResult };

function statusBadge(availability?: CheckDomainAvailabilityResult) {
  if (!availability) return null;
  if (availability.errorMessage) return <Badge variant="destructive">Ошибка</Badge>;
  if (!availability.available) return <Badge variant="destructive">Занят</Badge>;
  return <Badge variant="outline">Свободен</Badge>;
}

export function GenerateDomainsDialog({ onPurchased }: { onPurchased: () => void }) {
  const [open, setOpen] = useState(false);
  const [registrarAccountId, setRegistrarAccountId] = useState("");
  const [tlds, setTlds] = useState<string[]>([]);
  const [count, setCount] = useState("10");
  const [candidates, setCandidates] = useState<Candidate[]>();
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseKey, setPurchaseKey] = useState(0);
  const [purchaseRegistrarAccountId, setPurchaseRegistrarAccountId] = useState("");
  const [purchaseRows, setPurchaseRows] = useState<PurchaseDomainRow[]>([]);

  const accounts = useQuery({ queryKey: ["admin-domain-registrar-accounts"], queryFn: adminApi.listDomainRegistrarAccounts, retry: false, enabled: open });
  const zonePricing = useQuery({
    queryKey: ["admin-zone-pricing", registrarAccountId],
    queryFn: () => adminApi.listZonePricing({ registrarAccountId }),
    enabled: open && Boolean(registrarAccountId),
    retry: false,
  });
  const availableTlds = zonePricing.data?.map((zone) => zone.tld).sort() ?? [];

  const reset = () => {
    setRegistrarAccountId("");
    setTlds([]);
    setCount("10");
    setCandidates(undefined);
  };

  const generateMutation = useMutation({
    mutationFn: () => adminApi.generateDomainCandidates({ tlds, count: Number(count) }),
    onSuccess: (result) => setCandidates(result.fqdns.map((fqdn) => ({ fqdn, selected: true }))),
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось сгенерировать домены."),
  });

  const checkMutation = useMutation({
    mutationFn: () => adminApi.checkDomainAvailability(registrarAccountId, (candidates ?? []).map((candidate) => candidate.fqdn)),
    onSuccess: (results) => {
      const byFqdn = new Map(results.map((result) => [result.fqdn, result]));
      setCandidates((prev) =>
        (prev ?? []).map((candidate) => {
          const availability = byFqdn.get(candidate.fqdn);
          return { ...candidate, availability, selected: Boolean(availability?.available) };
        }),
      );
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось проверить доступность доменов."),
  });

  const toggleTld = (tld: string) => setTlds((prev) => (prev.includes(tld) ? prev.filter((value) => value !== tld) : [...prev, tld]));
  const toggleCandidate = (fqdn: string) =>
    setCandidates((prev) => prev?.map((candidate) => (candidate.fqdn === fqdn ? { ...candidate, selected: !candidate.selected } : candidate)));

  const countNumber = Number(count);
  const canGenerate = Boolean(registrarAccountId) && tlds.length > 0 && Number.isInteger(countNumber) && countNumber >= 1 && countNumber <= 100 && !generateMutation.isPending;
  const purchasableCandidates = (candidates ?? []).filter((candidate) => candidate.selected && candidate.availability?.available && candidate.availability.priceCents != null);

  const startPurchase = () => {
    setPurchaseRegistrarAccountId(registrarAccountId);
    setPurchaseRows(purchasableCandidates.map((candidate) => ({ fqdn: candidate.fqdn, costCents: String(candidate.availability!.priceCents) })));
    // Force PurchaseDomainsDialog to remount so its internal state (seeded from initialRows/
    // initialRegistrarAccountId only once, at mount) picks up this handoff's fresh values.
    setPurchaseKey((key) => key + 1);
    setOpen(false);
    reset();
    setPurchaseOpen(true);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogTrigger
          render={
            <Button size="sm" variant="outline">
              <SparklesIcon />
              Сгенерировать домены
            </Button>
          }
        />
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Сгенерировать домены</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label>Аккаунт регистратора</Label>
              {accounts.isLoading ? (
                <p className="text-sm text-muted-foreground">Загрузка списка аккаунтов…</p>
              ) : accounts.isError ? (
                <p className="text-sm text-destructive">Не удалось получить список аккаунтов регистратора.</p>
              ) : !accounts.data || accounts.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ни одного аккаунта регистратора не настроено.</p>
              ) : (
                <Select
                  items={accounts.data.map((account) => ({ value: account.id, label: `${account.code} · ${account.environment}` }))}
                  value={registrarAccountId}
                  onValueChange={(value) => {
                    setRegistrarAccountId(value ?? "");
                    setTlds([]);
                    setCandidates(undefined);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите аккаунт" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Регистратор</SelectLabel>
                      {accounts.data.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} · {account.environment}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>

            {registrarAccountId && !candidates && (
              <>
                <div className="space-y-2">
                  <Label>Зоны (TLD)</Label>
                  {zonePricing.isLoading ? (
                    <p className="text-sm text-muted-foreground">Загрузка каталога цен…</p>
                  ) : availableTlds.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Каталог цен по зонам пуст для этого аккаунта —{" "}
                      <Link href="/infrastructure/domains/zone-pricing" className="underline">
                        синхронизируйте его
                      </Link>{" "}
                      перед генерацией.
                    </p>
                  ) : (
                    <>
                      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border p-2">
                        {availableTlds.map((tld) => (
                          <label key={tld} className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-accent">
                            <Checkbox checked={tlds.includes(tld)} onCheckedChange={() => toggleTld(tld)} />.{tld}
                          </label>
                        ))}
                      </div>
                      {tlds.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tlds.map((tld) => (
                            <Badge key={tld} variant="outline">
                              .{tld}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Сколько доменов сгенерировать</Label>
                  <Input type="number" min={1} max={100} className="w-32" value={count} onChange={(event) => setCount(event.target.value)} />
                </div>
              </>
            )}

            {candidates && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Кандидаты ({candidates.length})</Label>
                  <Button size="sm" variant="outline" disabled={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
                    {generateMutation.isPending && <Spinner />}
                    <RefreshCwIcon />
                    Сгенерировать ещё
                  </Button>
                </div>
                <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-md border p-2">
                  {candidates.map((candidate) => (
                    <label key={candidate.fqdn} className="flex items-center justify-between gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-accent">
                      <span className="flex items-center gap-2">
                        <Checkbox
                          checked={candidate.selected}
                          disabled={Boolean(candidate.availability) && !candidate.availability?.available}
                          onCheckedChange={() => toggleCandidate(candidate.fqdn)}
                        />
                        {candidate.fqdn}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {candidate.availability?.premium && <Badge variant="outline">premium</Badge>}
                        {candidate.availability?.priceCents != null && `${candidate.availability.priceCents} ${candidate.availability.currency ?? ""}`}
                        {candidate.availability?.errorMessage}
                        {statusBadge(candidate.availability)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
            {!candidates ? (
              <Button disabled={!canGenerate} onClick={() => generateMutation.mutate()}>
                {generateMutation.isPending && <Spinner />}
                Сгенерировать
              </Button>
            ) : candidates.every((candidate) => !candidate.availability) ? (
              <Button disabled={checkMutation.isPending} onClick={() => checkMutation.mutate()}>
                {checkMutation.isPending && <Spinner />}
                Проверить доступность
              </Button>
            ) : (
              <Button disabled={purchasableCandidates.length === 0} onClick={startPurchase}>
                Купить выбранные ({purchasableCandidates.length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PurchaseDomainsDialog
        key={purchaseKey}
        trigger={null}
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        initialRegistrarAccountId={purchaseRegistrarAccountId}
        initialRows={purchaseRows}
        onPurchased={onPurchased}
      />
    </>
  );
}
