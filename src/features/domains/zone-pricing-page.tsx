"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { AdminZonePricingQuery, ZonePricing } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { can } from "@/lib/access-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

function ZoneDetailDialog({
  zone,
  registrarAccountId,
  mayWrite,
  onOpenChange,
}: {
  zone?: ZonePricing;
  registrarAccountId: string;
  mayWrite: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verificationNote, setVerificationNote] = useState("");

  const syncFormFrom = (row: ZonePricing) => {
    setRequiresVerification(row.requiresVerification);
    setVerificationNote(row.verificationNote ?? "");
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-zone-pricing", registrarAccountId] });

  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateZonePricing(zone!.tld, { registrarAccountId, requiresVerification, verificationNote: verificationNote || undefined }),
    onSuccess: async () => {
      toast.success("Флаг проверки сохранён.");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось сохранить."),
  });

  const checkMutation = useMutation({
    mutationFn: () => adminApi.checkZoneRequirements(zone!.tld, registrarAccountId),
    onSuccess: async (result) => {
      if (result.autoFlagged) toast.success(`Флаг проставлен автоматически по данным регистратора (.${result.tld}).`);
      else toast.success("Проверка выполнена — регистратор не сообщает о требовании верификации.");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось проверить требования у регистратора."),
  });

  return (
    <Dialog
      open={Boolean(zone)}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next && zone) syncFormFrom(zone);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        {zone && (
          <>
            <DialogHeader>
              <DialogTitle>.{zone.tld}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Регистрация</p>
                <p className="text-sm font-medium">{formatUsd(zone.registrationPriceCents)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Продление</p>
                <p className="text-sm font-medium">{formatUsd(zone.renewalPriceCents)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Трансфер</p>
                <p className="text-sm font-medium">{formatUsd(zone.transferPriceCents)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Владение 3 года</p>
                <p className="text-sm font-medium">{formatUsd(zone.threeYearTcoCents)}</p>
              </div>
              {zone.specialType && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Особый тип</p>
                  <p className="text-sm font-medium">{zone.specialType}</p>
                </div>
              )}
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Синхронизировано</p>
                <p className="text-sm font-medium">{formatDate(zone.syncedAt)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="zone-requires-verification">Требует проверки у регистратора</Label>
                <Switch
                  id="zone-requires-verification"
                  checked={requiresVerification}
                  disabled={!mayWrite}
                  onCheckedChange={setRequiresVerification}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone-verification-note">Заметка</Label>
                <Textarea
                  id="zone-verification-note"
                  disabled={!mayWrite}
                  rows={2}
                  placeholder="Например: требуется подтверждённый адрес регистранта"
                  value={verificationNote}
                  onChange={(event) => setVerificationNote(event.target.value)}
                />
              </div>
              {mayWrite && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
                    {updateMutation.isPending && <Spinner />}
                    Сохранить
                  </Button>
                  <Button size="sm" variant="outline" disabled={checkMutation.isPending} onClick={() => checkMutation.mutate()}>
                    {checkMutation.isPending && <Spinner />}
                    Проверить у регистратора
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Закрыть</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ZonePricingPage() {
  const queryClient = useQueryClient();
  const [registrarAccountId, setRegistrarAccountId] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "tld", desc: false }]);
  const [selectedTld, setSelectedTld] = useState<string>();

  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "domains.write");
  const accounts = useQuery({ queryKey: ["admin-domain-registrar-accounts"], queryFn: adminApi.listDomainRegistrarAccounts, retry: false });

  const sortBy = (sorting[0]?.id ?? "tld") as NonNullable<AdminZonePricingQuery>["sortBy"];
  const order = sorting[0]?.desc ? "desc" : "asc";
  const zonePricing = useQuery({
    queryKey: ["admin-zone-pricing", registrarAccountId, sortBy, order],
    queryFn: () => adminApi.listZonePricing({ registrarAccountId, sortBy, order }),
    enabled: Boolean(registrarAccountId),
    retry: false,
  });

  const syncMutation = useMutation({
    mutationFn: () => adminApi.syncZonePricing(registrarAccountId),
    onSuccess: async (result) => {
      toast.success(`Синхронизировано зон: ${result.synced ?? 0}.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-zone-pricing", registrarAccountId] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось синхронизировать каталог цен."),
  });

  const columns: ColumnDef<ZonePricing>[] = [
    { id: "tld", header: "Зона", cell: ({ row }) => <span className="font-medium">.{row.original.tld}</span> },
    { id: "registrationPriceCents", header: "Регистрация", cell: ({ row }) => formatUsd(row.original.registrationPriceCents) },
    { id: "renewalPriceCents", header: "Продление", cell: ({ row }) => formatUsd(row.original.renewalPriceCents) },
    { id: "threeYearTco", header: "Владение 3 года", cell: ({ row }) => formatUsd(row.original.threeYearTcoCents), enableSorting: true },
    {
      id: "requiresVerification",
      header: "Проверка",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.requiresVerification ? (
          <Tooltip>
            <TooltipTrigger render={<Badge variant="destructive" className="cursor-help" />}>⚠ Требует проверки</TooltipTrigger>
            <TooltipContent>{row.original.verificationNote || "Причина не указана"}</TooltipContent>
          </Tooltip>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Цены по зонам"
        description="Локальный каталог цен регистратора по доменным зонам — регистрация, продление и стоимость владения за 3 года"
        actions={
          registrarAccountId &&
          mayWrite && (
            <Button size="sm" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
              {syncMutation.isPending && <Spinner />}
              Обновить цены
            </Button>
          )
        }
      />

      <div className="max-w-80">
        <Select
          items={(accounts.data ?? []).map((account) => ({ value: account.id, label: `${account.code} · ${account.environment}` }))}
          value={registrarAccountId}
          onValueChange={(value) => setRegistrarAccountId(value ?? "")}
        >
          <SelectTrigger className="w-full" aria-label="Регистратор">
            <SelectValue placeholder="Выберите аккаунт регистратора" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Регистратор</SelectLabel>
              {(accounts.data ?? []).map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.code} · {account.environment}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {!registrarAccountId ? (
        <EmptyState title="Выберите аккаунт регистратора" description="Каталог цен привязан к конкретному аккаунту регистратора" />
      ) : !zonePricing.isLoading && !zonePricing.isError && (zonePricing.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="Каталог цен пуст"
          description="Ещё ни разу не синхронизировался для этого аккаунта"
          action={
            mayWrite && (
              <Button size="sm" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
                {syncMutation.isPending && <Spinner />}
                Обновить цены
              </Button>
            )
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={zonePricing.data ?? []}
          isLoading={zonePricing.isLoading}
          isError={zonePricing.isError}
          errorMessage="Не удалось получить каталог цен."
          sorting={sorting}
          onSortingChange={setSorting}
          onRowClick={(zone) => setSelectedTld(zone.tld)}
        />
      )}

      <ZoneDetailDialog
        zone={(zonePricing.data ?? []).find((zone) => zone.tld === selectedTld)}
        registrarAccountId={registrarAccountId}
        mayWrite={mayWrite}
        onOpenChange={(open) => !open && setSelectedTld(undefined)}
      />
    </AppShell>
  );
}
