"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Activity, CircleAlert, RadioTower, Server } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { AdminInfrastructureIncidentQuery, ControlPlaneSourceSummary, InfrastructureEndpointSummary, InfrastructureIncidentSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { CountryFlag } from "@/components/country-flag";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { EndpointName } from "@/components/endpoint-name";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { CreateSourceDialog } from "@/features/infrastructure/create-source-dialog";
import { EndpointEditDialog } from "@/features/infrastructure/endpoint-edit-dialog";
import { RotateCredentialsDialog } from "@/features/infrastructure/rotate-credentials-dialog";
import { SourceEditDialog } from "@/features/infrastructure/source-edit-dialog";
import { can } from "@/lib/access-control";

const pageSize = 25;

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function providerLabel(providerType: string) {
  if (providerType === "3X_UI") return "3x-ui";
  if (providerType === "REMNAWAVE") return "Remnawave";
  return providerType;
}

const endpointColumns: ColumnDef<InfrastructureEndpointSummary>[] = [
  {
    accessorKey: "name",
    header: "Endpoint",
    cell: ({ row }) => (
      <span className="font-medium">
        <EndpointName name={row.original.name} />
      </span>
    ),
  },
  { accessorKey: "sourceCode", header: "Панель" },
  { id: "location", header: "Локация", cell: ({ row }) => [row.original.countryCode, row.original.city].filter(Boolean).join(" · ") || "—" },
  { id: "protocol", header: "Протокол", cell: ({ row }) => row.original.protocol + (row.original.transport ? ` · ${row.original.transport}` : "") },
  { id: "healthStatus", header: "Здоровье", cell: ({ row }) => <Badge>{row.original.healthStatus}</Badge> },
  { id: "lastProbe", header: "Последняя проверка", cell: ({ row }) => formatDate(row.original.lastProbeAt ?? row.original.lastSeenAt) },
];

const incidentColumns: ColumnDef<InfrastructureIncidentSummary>[] = [
  { id: "openedAt", header: "Открыт", cell: ({ row }) => formatDate(row.original.openedAt) },
  { id: "severity", header: "Критичность", cell: ({ row }) => <Badge>{row.original.severity}</Badge> },
  { id: "status", header: "Статус", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
  { accessorKey: "kind", header: "Тип" },
  { id: "endpointName", header: "Endpoint", cell: ({ row }) => (row.original.endpointName ? <EndpointName name={row.original.endpointName} /> : "—") },
  {
    id: "summary",
    header: "Описание",
    cell: ({ row }) => (
      <div>
        <p>{row.original.summary}</p>
        {row.original.resolvedAt && <p className="text-xs text-muted-foreground">Закрыт: {formatDate(row.original.resolvedAt)}</p>}
      </div>
    ),
  },
];

export default function InfrastructurePage() {
  const [endpointPage, setEndpointPage] = useState(1);
  const [sourceCode, setSourceCode] = useState("all");
  const [countryCode, setCountryCode] = useState("");
  const [protocol, setProtocol] = useState("");
  const [healthStatus, setHealthStatus] = useState("");
  const [incidentPage, setIncidentPage] = useState(1);
  const [incidentStatus, setIncidentStatus] = useState<AdminInfrastructureIncidentQuery["status"] | "all">("all");
  const [severity, setSeverity] = useState<AdminInfrastructureIncidentQuery["severity"] | "all">("all");
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>();

  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "infrastructure.write");
  const summary = useQuery({ queryKey: ["admin-infrastructure-summary"], queryFn: adminApi.getInfrastructureSummary, retry: false });
  const sources = useQuery({ queryKey: ["admin-infrastructure-sources"], queryFn: adminApi.listControlPlaneSources, retry: false });
  const endpointsForCountries = useQuery({ queryKey: ["admin-infrastructure-endpoints-all"], queryFn: () => adminApi.listInfrastructureEndpoints({ page: 1, pageSize: 100 }), retry: false });
  const endpointCountries = [...new Set((endpointsForCountries.data?.items ?? []).map((item) => item.countryCode).filter(Boolean))].sort();
  const endpoints = useQuery({
    queryKey: ["admin-infrastructure-endpoints", endpointPage, sourceCode, countryCode, protocol, healthStatus],
    queryFn: () =>
      adminApi.listInfrastructureEndpoints({
        page: endpointPage,
        pageSize,
        ...(sourceCode !== "all" ? { sourceCode } : {}),
        ...(countryCode ? { countryCode } : {}),
        ...(protocol ? { protocol } : {}),
        ...(healthStatus ? { healthStatus } : {}),
      }),
    retry: false,
  });
  const incidents = useQuery({
    queryKey: ["admin-infrastructure-incidents", incidentPage, incidentStatus, severity],
    queryFn: () =>
      adminApi.listInfrastructureIncidents({
        page: incidentPage,
        pageSize,
        ...(incidentStatus !== "all" ? { status: incidentStatus } : {}),
        ...(severity !== "all" ? { severity } : {}),
      }),
    retry: false,
  });

  const endpointPages = Math.max(1, Math.ceil((endpoints.data?.total ?? 0) / (endpoints.data?.pageSize ?? pageSize)));
  const incidentPages = Math.max(1, Math.ceil((incidents.data?.total ?? 0) / (incidents.data?.pageSize ?? pageSize)));
  const counters = [
    { label: "Панели", value: summary.data?.sources, icon: RadioTower },
    { label: "Endpoints", value: summary.data?.endpoints, icon: Server },
    { label: "Исправны", value: summary.data?.healthy, icon: Activity },
    { label: "Неисправны", value: summary.data?.unhealthy, icon: CircleAlert },
    { label: "Открытые инциденты", value: summary.data?.openIncidents, icon: CircleAlert },
  ];

  return (
    <AppShell>
      <PageHeader title="Инфраструктура" description="Список серверов (endpoint'ов), их состояние здоровья и открытые инциденты — клик по строке панели или endpoint'а открывает редактирование" />

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
        {counters.map(({ label, value, icon: Icon }) => (
          <StatCard key={label} label={label} icon={Icon} value={summary.isLoading ? "…" : summary.isError ? "—" : (value ?? 0)} />
        ))}
      </div>

      <SourcesCard sources={sources} mayWrite={mayWrite} />

      <Card id="endpoints" className="scroll-mt-(--header-height)">
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
          <CardDescription>Серверы платформы по всем панелям — страна, протокол и состояние здоровья</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Select
              items={[{ value: "all", label: "Все панели" }, ...(sources.data?.map((source) => ({ value: source.code, label: source.code })) ?? [])]}
              value={sourceCode}
              onValueChange={(value) => { setSourceCode(value ?? "all"); setEndpointPage(1); }}
            >
              <SelectTrigger aria-label="Панель">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все панели</SelectItem>
                {sources.data?.map((source) => (
                  <SelectItem key={source.id} value={source.code}>
                    {source.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              items={[{ value: "all", label: "Все страны" }, ...endpointCountries.map((code) => ({ value: code, label: code }))]}
              value={countryCode || "all"}
              onValueChange={(value) => { setCountryCode(value === "all" ? "" : (value ?? "")); setEndpointPage(1); }}
            >
              <SelectTrigger aria-label="Страна">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все страны</SelectItem>
                {endpointCountries.map((code) => (
                  <SelectItem key={code} value={code}>
                    <CountryFlag code={code} className="mr-1" />
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input aria-label="Протокол" placeholder="Протокол" value={protocol} onChange={(event) => { setProtocol(event.target.value); setEndpointPage(1); }} />
            <Input aria-label="Здоровье" placeholder="Например HEALTHY" value={healthStatus} onChange={(event) => { setHealthStatus(event.target.value); setEndpointPage(1); }} />
          </div>
          <DataTable
            columns={endpointColumns}
            data={endpoints.data?.items ?? []}
            isLoading={endpoints.isLoading}
            isError={endpoints.isError}
            errorMessage="Не удалось получить данные инфраструктуры."
            emptyMessage="Данные не найдены."
            onRowClick={(item) => setSelectedEndpointId(item.id)}
            isRowActive={(item) => item.id === selectedEndpointId}
          />
          <DataTablePagination page={endpointPage} pageCount={endpointPages} onPageChange={setEndpointPage} />
        </CardContent>
      </Card>

      <Card id="incidents" className="scroll-mt-(--header-height)">
        <CardHeader>
          <CardTitle>Инциденты</CardTitle>
          <CardDescription>История проблем с endpoint&#39;ами — от временной деградации до полной недоступности</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <Select
              items={[
                { value: "all", label: "Все статусы" },
                { value: "OPEN", label: "OPEN" },
                { value: "ACKNOWLEDGED", label: "ACKNOWLEDGED" },
                { value: "RESOLVED", label: "RESOLVED" },
              ]}
              value={incidentStatus}
              onValueChange={(value) => { setIncidentStatus(value as typeof incidentStatus); setIncidentPage(1); }}
            >
              <SelectTrigger aria-label="Статус инцидента">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="OPEN">OPEN</SelectItem>
                <SelectItem value="ACKNOWLEDGED">ACKNOWLEDGED</SelectItem>
                <SelectItem value="RESOLVED">RESOLVED</SelectItem>
              </SelectContent>
            </Select>
            <Select
              items={[
                { value: "all", label: "Любая критичность" },
                { value: "INFO", label: "INFO" },
                { value: "WARNING", label: "WARNING" },
                { value: "CRITICAL", label: "CRITICAL" },
              ]}
              value={severity}
              onValueChange={(value) => { setSeverity(value as typeof severity); setIncidentPage(1); }}
            >
              <SelectTrigger aria-label="Критичность">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Любая критичность</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
                <SelectItem value="WARNING">WARNING</SelectItem>
                <SelectItem value="CRITICAL">CRITICAL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable
            columns={incidentColumns}
            data={incidents.data?.items ?? []}
            isLoading={incidents.isLoading}
            isError={incidents.isError}
            errorMessage="Не удалось получить данные инфраструктуры."
            emptyMessage="Данные не найдены."
          />
          <DataTablePagination page={incidentPage} pageCount={incidentPages} onPageChange={setIncidentPage} />
        </CardContent>
      </Card>

      <EndpointEditDialog
        endpoint={endpoints.data?.items.find((item) => item.id === selectedEndpointId)}
        onOpenChange={(open) => !open && setSelectedEndpointId(undefined)}
        mayWrite={mayWrite}
      />
    </AppShell>
  );
}

function SourcesCard({ sources, mayWrite }: { sources: ReturnType<typeof useQuery<Awaited<ReturnType<typeof adminApi.listControlPlaneSources>>>>; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const [syncingId, setSyncingId] = useState<string>();
  const [selectedSourceId, setSelectedSourceId] = useState<string>();
  const [sourceCountryFilter, setSourceCountryFilter] = useState("all");
  const syncMutation = useMutation({
    mutationFn: ({ id, countryCode }: { id: string; countryCode?: string }) => adminApi.syncSource(id, countryCode ? { countryCode } : {}),
    onMutate: ({ id }) => setSyncingId(id),
    onSuccess: async (result) => {
      toast.success(`Найдено endpoint'ов: ${result.count}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-sources"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-endpoints"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-summary"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось синхронизировать"),
    onSettled: () => setSyncingId(undefined),
  });

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
      { accessorKey: "endpointCount", header: "Endpoints" },
      { accessorKey: "unhealthyCount", header: "Неисправны" },
      {
        id: "sync",
        header: "Синхронизация",
        cell: ({ row }) => {
          const source = row.original;
          const needsCountry = source.providerType === "3X_UI" && !source.countryCode;
          return (
            <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
              <Button
                size="sm"
                variant="outline"
                disabled={syncingId === source.id || needsCountry}
                title={needsCountry ? "3x-ui не сообщает страну панели сама — задайте её в редактировании панели, чтобы синхронизировать" : undefined}
                onClick={() => syncMutation.mutate({ id: source.id, countryCode: source.countryCode ?? undefined })}
              >
                {syncingId === source.id && <Spinner />}
                Синхронизировать с панелью
              </Button>
              {mayWrite && <RotateCredentialsDialog sourceId={source.id} sourceCode={source.code} canAutoSync={source.providerType !== "3X_UI"} />}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncingId, mayWrite],
  );

  const sourceCountries = [...new Set((sources.data ?? []).map((source) => source.countryCode).filter(Boolean))].sort();
  const filteredSources = sourceCountryFilter === "all" ? (sources.data ?? []) : (sources.data ?? []).filter((source) => source.countryCode === sourceCountryFilter);

  return (
    <Card id="sources" className="scroll-mt-(--header-height)">
      <CardHeader>
        <CardTitle>Панели управления</CardTitle>
        <CardDescription>Панели Remnawave и 3x-ui, из которых платформа получает список серверов и их состояние</CardDescription>
        {mayWrite && (
          <CardAction>
            <CreateSourceDialog />
          </CardAction>
        )}
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
                <SelectItem value="all">Все страны</SelectItem>
                {sourceCountries.map((code) => (
                  <SelectItem key={code} value={code}>
                    <CountryFlag code={code} className="mr-1" />
                    {code}
                  </SelectItem>
                ))}
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
