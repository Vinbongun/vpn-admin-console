"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { ControlPlaneSourceSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { CountryFlag } from "@/components/country-flag";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/status-badge";
import { CreateSourceDialog } from "@/features/infrastructure/create-source-dialog";
import { SourceEditDialog } from "@/features/infrastructure/source-edit-dialog";
import { VpsListPage } from "@/features/vps/vps-list-page";
import { can } from "@/lib/access-control";
import { isPanelProviderType, providerLabel } from "@/lib/control-plane-provider";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

function sourceIdentityCell(source: ControlPlaneSourceSummary) {
  return (
    <div>
      <p className="font-medium">{source.code}</p>
      {source.countryCode && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <CountryFlag code={source.countryCode} />
          {source.countryName ?? source.countryCode}
        </p>
      )}
    </div>
  );
}

function PanelsCard() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "infrastructure.write");
  const allSources = useQuery({ queryKey: ["admin-infrastructure-sources"], queryFn: adminApi.listControlPlaneSources, retry: false });
  const sources = { ...allSources, data: allSources.data?.filter((source) => isPanelProviderType(source.providerType)) };
  const [syncingId, setSyncingId] = useState<string>();
  const [bulkSyncing, setBulkSyncing] = useState(false);
  // Deep-link support: other pages (VPS detail, domain detail, endpoints) link a panel as
  // /infrastructure/panels-and-servers?source={id} instead of duplicating the source-edit UI.
  const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>(searchParams.get("source") ?? undefined);
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
      { accessorKey: "code", header: "Панель", cell: ({ row }) => sourceIdentityCell(row.original) },
      { id: "provider", header: "Провайдер", cell: ({ row }) => providerLabel(row.original.providerType) },
      { id: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
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

  const sourceCountryOptions = [
    ...new Map((sources.data ?? []).filter((source) => source.countryCode).map((source) => [source.countryCode as string, source.countryName ?? source.countryCode])).entries(),
  ].sort(([, a], [, b]) => (a ?? "").localeCompare(b ?? ""));
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
        {sourceCountryOptions.length > 0 && (
          <div className="mb-4 max-w-64">
            <Select
              items={[{ value: "all", label: "Все страны" }, ...sourceCountryOptions.map(([code, name]) => ({ value: code, label: name ?? code }))]}
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
                  {sourceCountryOptions.map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      <CountryFlag code={code} className="mr-1" />
                      {name ?? code}
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
        onOpenChange={(open) => {
          if (open) return;
          setSelectedSourceId(undefined);
          if (searchParams.get("source")) router.replace("/infrastructure/panels-and-servers");
        }}
        mayWrite={mayWrite}
      />
    </Card>
  );
}

/**
 * Standalone protocols (WireGuard, Hysteria2, and whatever else lands via the not-yet-built
 * deploy-protocol role) are stored as control_plane_sources too - just with a providerType that
 * isn't REMNAWAVE/3X_UI, and no real API behind them (no sync, no credentials, no nodes). Same
 * query as PanelsCard (shared cache, filtered client-side the other way), trimmed columns - no
 * "Провайдер"/"Последняя синхронизация"/"Синхронизация", since none of that applies without an
 * API. Hidden entirely while there are none yet, rather than showing an empty card for a feature
 * nothing has used yet (unlike "Ноды" on a real panel, which is an existing entity with zero
 * children, not a whole entity family with zero instances anywhere in the system).
 */
function ProtocolsCard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "infrastructure.write");
  const allSources = useQuery({ queryKey: ["admin-infrastructure-sources"], queryFn: adminApi.listControlPlaneSources, retry: false });
  const vpsInstances = useQuery({ queryKey: ["admin-vps-instances", "all"], queryFn: () => adminApi.listVpsInstances(), retry: false });
  const protocolSources = (allSources.data ?? []).filter((source) => !isPanelProviderType(source.providerType));
  const vpsBySourceId = useMemo(
    () => new Map(vpsInstances.data?.filter((vps) => vps.controlPlaneSourceId).map((vps) => [vps.controlPlaneSourceId as string, vps])),
    [vpsInstances.data],
  );
  const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>(searchParams.get("source") ?? undefined);

  const columns = useMemo<ColumnDef<ControlPlaneSourceSummary>[]>(
    () => [
      { accessorKey: "code", header: "Протокол", cell: ({ row }) => sourceIdentityCell(row.original) },
      {
        id: "vps",
        header: "VPS",
        cell: ({ row }) => {
          const vps = vpsBySourceId.get(row.original.id);
          if (!vps) return "—";
          return (
            <Link href={`/infrastructure/vps/${vps.id}`} className="underline" onClick={(event) => event.stopPropagation()}>
              {vps.code}
            </Link>
          );
        },
      },
      { id: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        id: "health",
        header: "Здоровье",
        cell: ({ row }) => (row.original.unhealthyCount > 0 ? <span className="text-destructive">{row.original.unhealthyCount} из {row.original.endpointCount} неисправны</span> : `${row.original.endpointCount} точек, все исправны`),
      },
      ...(mayWrite
        ? [
            {
              id: "edit",
              header: "",
              cell: ({ row }: { row: { original: ControlPlaneSourceSummary } }) => (
                <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setSelectedSourceId(row.original.id); }}>
                  Редактировать
                </Button>
              ),
            } satisfies ColumnDef<ControlPlaneSourceSummary>,
          ]
        : []),
    ],
    [vpsBySourceId, mayWrite],
  );

  if (!allSources.isLoading && protocolSources.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Отдельные протоколы</CardTitle>
        <CardDescription>Протоколы вроде WireGuard, развёрнутые без панели — один протокол на выделенном VPS</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={protocolSources}
          isLoading={allSources.isLoading}
          isError={allSources.isError}
          errorMessage="Не удалось получить данные инфраструктуры."
          emptyMessage="Протоколов пока нет."
          onRowClick={(source) => setSelectedSourceId(source.id)}
          isRowActive={(source) => source.id === selectedSourceId}
        />
      </CardContent>

      <SourceEditDialog
        source={allSources.data?.find((source) => source.id === selectedSourceId)}
        onOpenChange={(open) => {
          if (open) return;
          setSelectedSourceId(undefined);
          if (searchParams.get("source")) router.replace("/infrastructure/panels-and-servers");
        }}
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
      <ProtocolsCard />
      <VpsListPage />
    </AppShell>
  );
}
