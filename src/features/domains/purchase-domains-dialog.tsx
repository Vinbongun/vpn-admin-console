"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { PurchaseBatchItemResult } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function quotedCentsFrom(message?: string): number | undefined {
  const match = message?.match(/quoted (\d+)/);
  return match ? Number(match[1]) : undefined;
}

function resultVariant(status: PurchaseBatchItemResult["status"]): "default" | "destructive" | "outline" {
  if (status === "FAILED") return "destructive";
  return status === "DRY_RUN_OK" ? "outline" : "default";
}

type Row = { fqdn: string; costCents: string };
const emptyRow: Row = { fqdn: "", costCents: "" };

export function PurchaseDomainsDialog({ onPurchased }: { onPurchased: () => void }) {
  const [open, setOpen] = useState(false);
  const [registrarAccountId, setRegistrarAccountId] = useState<string>();
  const [rows, setRows] = useState<Row[]>([{ ...emptyRow }]);
  const [dryRunResults, setDryRunResults] = useState<PurchaseBatchItemResult[]>();
  const [finalResults, setFinalResults] = useState<PurchaseBatchItemResult[]>();

  const accounts = useQuery({ queryKey: ["admin-domain-registrar-accounts"], queryFn: adminApi.listDomainRegistrarAccounts, retry: false, enabled: open });

  const reset = () => {
    setRegistrarAccountId(undefined);
    setRows([{ ...emptyRow }]);
    setDryRunResults(undefined);
    setFinalResults(undefined);
  };

  const validRows = rows.filter((row) => row.fqdn.trim());
  const allDryRunOk = Boolean(dryRunResults) && dryRunResults!.length === validRows.length && dryRunResults!.every((result) => result.status === "DRY_RUN_OK");

  const purchaseMutation = useMutation({
    mutationFn: (dryRun: boolean) =>
      adminApi.purchaseDomains({
        registrarAccountId: registrarAccountId!,
        domains: validRows.map((row) => ({ fqdn: row.fqdn.trim(), expectedCostCents: Number(row.costCents) || 0 })),
        dryRun,
      }),
    onSuccess: (result, dryRun) => {
      if (dryRun) {
        setDryRunResults(result.results);
      } else {
        setFinalResults(result.results);
        setDryRunResults(undefined);
        onPurchased();
        if (result.failed === 0) toast.success(`Куплено доменов: ${result.succeeded} из ${result.requested}.`);
        else toast.error(`Успешно: ${result.succeeded}, с ошибкой: ${result.failed} из ${result.requested}.`);
      }
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось выполнить запрос к регистратору."),
  });

  const applyQuote = (fqdn: string, cents: number) => {
    setRows((prev) => prev.map((row) => (row.fqdn.trim() === fqdn ? { ...row, costCents: String(cents) } : row)));
    setDryRunResults(undefined);
  };

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setDryRunResults(undefined);
  };

  const canCheck = Boolean(registrarAccountId) && validRows.length > 0 && !purchaseMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm">Купить домены</Button>} />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Купить домены</DialogTitle>
        </DialogHeader>

        {finalResults ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Результат покупки — по каждому домену отдельно:</p>
            <div className="flex flex-col gap-2">
              {finalResults.map((result) => (
                <div key={result.fqdn} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="font-medium">{result.fqdn}</span>
                  <div className="flex items-center gap-2">
                    {result.errorMessage && <span className="text-xs text-muted-foreground">{result.errorMessage}</span>}
                    <Badge variant={resultVariant(result.status)}>{result.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label>Аккаунт регистратора</Label>
              {accounts.isLoading ? (
                <p className="text-sm text-muted-foreground">Загрузка списка аккаунтов…</p>
              ) : accounts.isError ? (
                <p className="text-sm text-destructive">Не удалось получить список аккаунтов регистратора.</p>
              ) : !accounts.data || accounts.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ни одного аккаунта регистратора не настроено — покупка недоступна.</p>
              ) : (
                <Select
                  items={accounts.data.map((account) => ({ value: account.id, label: `${account.code} · ${account.environment}` }))}
                  value={registrarAccountId}
                  onValueChange={(value) => setRegistrarAccountId(value ?? undefined)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите аккаунт" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.data.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} · {account.environment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Домены</Label>
                <Button size="sm" variant="outline" onClick={() => setRows((prev) => [...prev, { ...emptyRow }])}>
                  <PlusIcon />
                  Добавить домен
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Точную цену заранее узнать нельзя — отдельной ручки для этого нет. Введите любую оценку и нажмите «Проверить»: если цена не совпадёт,
                регистратор вернёт актуальную котировку, которую можно сразу подставить.
              </p>
              <div className="flex flex-col gap-2">
                {rows.map((row, index) => {
                  const rowResult = dryRunResults?.find((result) => result.fqdn === row.fqdn.trim());
                  const quote = rowResult?.errorCode === "PRICE_MISMATCH" ? quotedCentsFrom(rowResult.errorMessage) : undefined;
                  return (
                    <div key={index} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <Input placeholder="example.com" value={row.fqdn} onChange={(event) => updateRow(index, { fqdn: event.target.value })} />
                        <Input
                          type="number"
                          min={0}
                          placeholder="Цена, центы"
                          className="w-36"
                          value={row.costCents}
                          onChange={(event) => updateRow(index, { costCents: event.target.value })}
                        />
                        {rows.length > 1 && (
                          <Button size="icon-sm" variant="ghost" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}>
                            <XIcon />
                          </Button>
                        )}
                      </div>
                      {rowResult && (
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant={resultVariant(rowResult.status)}>{rowResult.status}</Badge>
                          {rowResult.errorMessage && <span className="text-muted-foreground">{rowResult.errorMessage}</span>}
                          {quote !== undefined && (
                            <Button size="sm" variant="link" className="h-auto p-0" onClick={() => applyQuote(row.fqdn, quote)}>
                              Подставить {quote}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>{finalResults ? "Закрыть" : "Отмена"}</DialogClose>
          {!finalResults &&
            (allDryRunOk ? (
              <Button disabled={purchaseMutation.isPending} onClick={() => purchaseMutation.mutate(false)}>
                {purchaseMutation.isPending && <Spinner />}
                Подтвердить покупку
              </Button>
            ) : (
              <Button disabled={!canCheck} onClick={() => purchaseMutation.mutate(true)}>
                {purchaseMutation.isPending && <Spinner />}
                Проверить
              </Button>
            ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
