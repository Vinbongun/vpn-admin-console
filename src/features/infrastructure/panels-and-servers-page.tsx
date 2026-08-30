"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { ControlPlaneSourceSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { CountryFlag } from "@/components/country-flag";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { CreateSourceDialog } from "@/features/infrastructure/create-source-dialog";
import { SourceEditDialog } from "@/features/infrastructure/source-edit-dialog";
import { VpsListPage } from "@/features/vps/vps-list-page";
import { can } from "@/lib/access-control";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

function providerLabel(providerType: string) {
  if (providerType === "3X_UI") return "3x-ui";
  if (providerType === "REMNAWAVE") return "Remnawave";
  return providerType;
}

function PanelsCard() {
  const queryClient = useQueryClient();
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "infrastructure.write");
  const sources = useQuery({ queryKey: ["admin-infrastructure-sources"], queryFn: adminApi.listControlPlaneSources, retry: false });
  const [syncingId, setSyncingId] = useState<string>();
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string>();
  const [sourceCountryFilter, setSourceCountryFilter] = useState("all");
  const anySyncing = bulkSyncing || Boolean(syncingId);
  const syncMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => adminApi.syncSource(id),
    onMutate: ({ id }) => setSyncingId(id),
    onSuccess: async (result) => {
      toast.success(`Найдено серверов: ${result.count}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-sources"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-endpoints"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-summary"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось синхронизировать"),
    onSettled: () => setSyncingId(undefined),
  });

  const syncAll = async () => {
    const targets = (sources.data ?? []).filter((source) => source.status === "ACTIVE");
    if (targets.length === 0) {
      toast.error("Нет активных панелей для синхронизации.");
      return;
    }
    setBulkSyncing(true);
    let okCount = 0;
    const failures: { code: string; message: string }[] = [];
    for (let i = 0; i < targets.length; i++) {
      const source = targets[i];
      setSyncingId(source.id);
      try {
        const result = await adminApi.syncSource(source.id);
        okCount += 1;
        void result;
      } catch (error) {
        failures.push({ code: source.code, message: error instanceof ApiError ? apiErrorMessage(error) : "Не удалось синхронизировать" });
      }
      if (i < targets.length - 1) await new Promise((resolve) => setTimeout(resolve, 400));
    }
    setSyncingId(undefined);
    setBulkSyncing(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-sources"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-endpoints"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-summary"] }),
    ]);
    if (failures.length === 0) {
      toast.success(`Синхронизировано панелей: ${okCount} из ${targets.length}.`);
    } else {
      toast.error(`Успешно: ${okCount}, с ошибкой: ${failures.length} из ${targets.length}`, {
        description: failures.map((failure) => `${failure.code}: ${failure.message}`).join("\n"),
      });
    }
  };

  const columns = useMemo<ColumnDef<ControlPlaneSourceSummary>[]>(
    () => [
      { accessorKey: "code", header: "Панель", cell: ({ row }) => <span className="font-medium">{row.original.code}</span> },
      { id: "provider", header: "Провайдер", cell: ({ row }) => providerLabel(row.original.providerType) },
      { id: "status", header: "Статус", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
      {
        id: "lastInventory",
        header: "Последняя синхронизация",
        cell: ({ row }) => (
          <div>
            <p>{row.original.lastInventoryStatus ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{formatDate(row.original.lastInventoryAt)}</p>
            {row.original.lastInventoryError && <p className="mt-1 text-xs text-destructive">{row.original.lastInventoryError}</p>}
          </div>
        ),
      },
      { accessorKey: "endpointCount", header: "Точки подключения" },
      { accessorKey: "unhealthyCount", header: "Неисправны" },
      {
        id: "sync",
        header: "Синхронизация",
        cell: ({ row }) => {
          const source = row.original;
          return (
            <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
              <Button
                size="sm"
                variant="outline"
                disabled={anySyncing}
                onClick={() => syncMutation.mutate({ id: source.id })}
              >
                {syncingId === source.id && <Spinner />}
                Синхронизировать с панелью
              </Button>
              {mayWrite && (
                <Button size="sm" variant="outline" onClick={() => setSelectedSourceId(source.id)}>
                  Редактировать
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncingId, anySyncing, mayWrite],
  );

  const sourceCountries = [...new Set((sources.data ?? []).map((source) => source.countryCode).filter(Boolean))].sort();
  const filteredSources = sourceCountryFilter === "all" ? (sources.data ?? []) : (sources.data ?? []).filter((source) => source.countryCode === sourceCountryFilter);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Панели управления</CardTitle>
        <CardDescription>Панели Remnawave и 3x-ui, из которых платформа получает список серверов и их состояние</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={anySyncing || !sources.data?.length} onClick={syncAll}>
              {bulkSyncing && <Spinner />}
              Обновить все панели
            </Button>
            {mayWrite && <CreateSourceDialog />}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {sourceCountries.length > 0 && (
          <div className="mb-4 max-w-64">
            <Select
              items={[{ value: "all", label: "Все страны" }, ...sourceCountries.map((code) => ({ value: code, label: code }))]}
              value={sourceCountryFilter}
              onValueChange={(value) => setSourceCountryFilter(value ?? "all")}
            >
              <SelectTrigger aria-label="Страна панели">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Страна панели</SelectLabel>
                  <SelectItem value="all">Все страны</SelectItem>
                  {sourceCountries.map((code) => (
                    <SelectItem key={code} value={code}>
                      <CountryFlag code={code} className="mr-1" />
                      {code}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
        <DataTable
          columns={columns}
          data={filteredSources}
          isLoading={sources.isLoading}
          isError={sources.isError}
          errorMessage="Не удалось получить данные инфраструктуры."
          emptyMessage="Данные не найдены."
          onRowClick={(source) => setSelectedSourceId(source.id)}
          isRowActive={(source) => source.id === selectedSourceId}
        />
      </CardContent>

      <SourceEditDialog
        source={sources.data?.find((source) => source.id === selectedSourceId)}
        onOpenChange={(open) => !open && setSelectedSourceId(undefined)}
        mayWrite={mayWrite}
      />
    </Card>
  );
}

export function PanelsAndServersPage() {
  return (
    <AppShell>
      <PageHeader
        title="Панели и серверы"
        description="Панели управления (Remnawave/3x-ui) и физические VPS-серверы — одна панель теперь может обслуживать несколько VPS"
      />

      <PanelsCard />
      <VpsListPage />
    </AppShell>
  );
}
