"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CircleAlert, RadioTower, Server } from "lucide-react";
import { useState } from "react";
import { adminApi, ApiError } from "@/api/client";
import type { AdminInfrastructureIncidentQuery } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const pageSize = 25;
const selectClassName = "h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

function QueryMessage({ loading, error, empty, children }: { loading: boolean; error: boolean; empty: boolean; children: React.ReactNode }) {
  if (loading) return <p className="text-sm text-muted-foreground">Загрузка…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">Не удалось получить данные инфраструктуры.</p>;
  if (empty) return <p className="text-sm text-muted-foreground">Данные не найдены.</p>;
  return children;
}

export default function InfrastructurePage() {
  const [endpointPage, setEndpointPage] = useState(1);
  const [sourceCode, setSourceCode] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [protocol, setProtocol] = useState("");
  const [healthStatus, setHealthStatus] = useState("");
  const [incidentPage, setIncidentPage] = useState(1);
  const [incidentStatus, setIncidentStatus] = useState<AdminInfrastructureIncidentQuery["status"]>();
  const [severity, setSeverity] = useState<AdminInfrastructureIncidentQuery["severity"]>();

  const summary = useQuery({ queryKey: ["admin-infrastructure-summary"], queryFn: adminApi.getInfrastructureSummary, retry: false });
  const sources = useQuery({ queryKey: ["admin-infrastructure-sources"], queryFn: adminApi.listControlPlaneSources, retry: false });
  const endpoints = useQuery({
    queryKey: ["admin-infrastructure-endpoints", endpointPage, sourceCode, countryCode, protocol, healthStatus],
    queryFn: () => adminApi.listInfrastructureEndpoints({ page: endpointPage, pageSize, ...(sourceCode ? { sourceCode } : {}), ...(countryCode ? { countryCode } : {}), ...(protocol ? { protocol } : {}), ...(healthStatus ? { healthStatus } : {}) }),
    retry: false,
  });
  const incidents = useQuery({
    queryKey: ["admin-infrastructure-incidents", incidentPage, incidentStatus, severity],
    queryFn: () => adminApi.listInfrastructureIncidents({ page: incidentPage, pageSize, ...(incidentStatus ? { status: incidentStatus } : {}), ...(severity ? { severity } : {}) }),
    retry: false,
  });

  const endpointPages = Math.max(1, Math.ceil((endpoints.data?.total ?? 0) / (endpoints.data?.pageSize ?? pageSize)));
  const incidentPages = Math.max(1, Math.ceil((incidents.data?.total ?? 0) / (incidents.data?.pageSize ?? pageSize)));
  const counters = [
    { label: "Источники", value: summary.data?.sources, icon: RadioTower },
    { label: "Endpoints", value: summary.data?.endpoints, icon: Server },
    { label: "Исправны", value: summary.data?.healthy, icon: Activity },
    { label: "Неисправны", value: summary.data?.unhealthy, icon: CircleAlert },
    { label: "Открытые инциденты", value: summary.data?.openIncidents, icon: CircleAlert },
  ];

  return <AppShell>
    <PageHeader title="Инфраструктура" description="Список серверов (endpoint'ов), их состояние здоровья и открытые инциденты — данные доступны только для просмотра" />
    <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{counters.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center justify-between pt-6"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{summary.isLoading ? "…" : summary.isError ? "—" : value ?? 0}</p></div><Icon className="size-5 text-muted-foreground" /></CardContent></Card>)}</div>
    <SourcesCard query={sources} />
    <Card className="mb-4"><CardHeader><CardTitle>Endpoints</CardTitle><CardDescription>Серверы платформы во всех источниках — страна, протокол и состояние здоровья</CardDescription></CardHeader><CardContent><div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><select aria-label="Источник" className={selectClassName} value={sourceCode} onChange={(event) => { setSourceCode(event.target.value); setEndpointPage(1); }}><option value="">Все источники</option>{sources.data?.map((source) => <option value={source.code} key={source.id}>{source.code}</option>)}</select><Input aria-label="Страна" placeholder="Страна, например DE" value={countryCode} onChange={(event) => { setCountryCode(event.target.value); setEndpointPage(1); }} /><Input aria-label="Протокол" placeholder="Протокол" value={protocol} onChange={(event) => { setProtocol(event.target.value); setEndpointPage(1); }} /><Input aria-label="Здоровье" placeholder="Например HEALTHY" value={healthStatus} onChange={(event) => { setHealthStatus(event.target.value); setEndpointPage(1); }} /></div><div className="overflow-x-auto"><QueryMessage loading={endpoints.isLoading} error={endpoints.isError} empty={!endpoints.data?.items.length}><table className="w-full min-w-4xl text-sm"><thead><tr className="border-b text-left"><th className="p-3">Endpoint</th><th className="p-3">Источник</th><th className="p-3">Локация</th><th className="p-3">Протокол</th><th className="p-3">Здоровье</th><th className="p-3">Последняя проверка</th></tr></thead><tbody>{endpoints.data?.items.map((endpoint) => <tr className="border-b last:border-0" key={endpoint.id}><td className="p-3 font-medium">{endpoint.name}</td><td className="p-3">{endpoint.sourceCode}</td><td className="p-3">{[endpoint.countryCode, endpoint.city].filter(Boolean).join(" · ")}</td><td className="p-3">{endpoint.protocol}{endpoint.transport ? ` · ${endpoint.transport}` : ""}</td><td className="p-3"><Badge>{endpoint.healthStatus}</Badge></td><td className="p-3">{formatDate(endpoint.lastProbeAt ?? endpoint.lastSeenAt)}</td></tr>)}</tbody></table></QueryMessage></div><Pagination page={endpointPage} pages={endpointPages} onPrevious={() => setEndpointPage((value) => value - 1)} onNext={() => setEndpointPage((value) => value + 1)} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Инциденты</CardTitle><CardDescription>История проблем с endpoint&#39;ами — от временной деградации до полной недоступности</CardDescription></CardHeader><CardContent><div className="mb-4 grid gap-3 md:grid-cols-2"><select aria-label="Статус инцидента" className={selectClassName} value={incidentStatus ?? ""} onChange={(event) => { setIncidentStatus((event.target.value || undefined) as AdminInfrastructureIncidentQuery["status"]); setIncidentPage(1); }}><option value="">Все статусы</option><option value="OPEN">OPEN</option><option value="ACKNOWLEDGED">ACKNOWLEDGED</option><option value="RESOLVED">RESOLVED</option></select><select aria-label="Критичность" className={selectClassName} value={severity ?? ""} onChange={(event) => { setSeverity((event.target.value || undefined) as AdminInfrastructureIncidentQuery["severity"]); setIncidentPage(1); }}><option value="">Любая критичность</option><option value="INFO">INFO</option><option value="WARNING">WARNING</option><option value="CRITICAL">CRITICAL</option></select></div><div className="overflow-x-auto"><QueryMessage loading={incidents.isLoading} error={incidents.isError} empty={!incidents.data?.items.length}><table className="w-full min-w-4xl text-sm"><thead><tr className="border-b text-left"><th className="p-3">Открыт</th><th className="p-3">Критичность</th><th className="p-3">Статус</th><th className="p-3">Тип</th><th className="p-3">Endpoint</th><th className="p-3">Описание</th></tr></thead><tbody>{incidents.data?.items.map((incident) => <tr className="border-b last:border-0" key={incident.id}><td className="p-3">{formatDate(incident.openedAt)}</td><td className="p-3"><Badge>{incident.severity}</Badge></td><td className="p-3"><Badge>{incident.status}</Badge></td><td className="p-3">{incident.kind}</td><td className="p-3">{incident.endpointName ?? "—"}</td><td className="p-3"><p>{incident.summary}</p>{incident.resolvedAt && <p className="text-xs text-muted-foreground">Закрыт: {formatDate(incident.resolvedAt)}</p>}</td></tr>)}</tbody></table></QueryMessage></div><Pagination page={incidentPage} pages={incidentPages} onPrevious={() => setIncidentPage((value) => value - 1)} onNext={() => setIncidentPage((value) => value + 1)} /></CardContent></Card>
  </AppShell>;
}

function SourcesCard({ query }: { query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof adminApi.listControlPlaneSources>>>> }) {
  const queryClient = useQueryClient();
  const [countryCodes, setCountryCodes] = useState<Record<string, string>>({});
  const [syncResult, setSyncResult] = useState<Record<string, string>>({});
  const [syncingId, setSyncingId] = useState<string>();
  const syncMutation = useMutation({
    mutationFn: ({ id, countryCode }: { id: string; countryCode?: string }) => adminApi.syncSource(id, countryCode ? { countryCode } : {}),
    onMutate: ({ id }) => setSyncingId(id),
    onSuccess: async (result, { id }) => {
      setSyncResult((value) => ({ ...value, [id]: `Найдено endpoint'ов: ${result.count}` }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-sources"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-endpoints"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-summary"] }),
      ]);
    },
    onError: (error, { id }) => setSyncResult((value) => ({ ...value, [id]: error instanceof ApiError ? error.message : "Не удалось синхронизировать" })),
    onSettled: () => setSyncingId(undefined),
  });

  return <Card className="mb-4"><CardHeader><CardTitle>Источники control plane</CardTitle><CardDescription>Панели Remnawave и 3x-ui, из которых платформа получает список серверов и их состояние</CardDescription></CardHeader><CardContent className="overflow-x-auto"><QueryMessage loading={query.isLoading} error={query.isError} empty={!query.data?.length}><table className="w-full min-w-4xl text-sm"><thead><tr className="border-b text-left"><th className="p-3">Источник</th><th className="p-3">Провайдер</th><th className="p-3">Статус</th><th className="p-3">Последняя синхронизация</th><th className="p-3">Endpoints</th><th className="p-3">Неисправны</th><th className="p-3">Синхронизация</th></tr></thead><tbody>{query.data?.map((source) => <tr className="border-b last:border-0" key={source.id}><td className="p-3 font-medium">{source.code}</td><td className="p-3">{source.providerType}</td><td className="p-3"><Badge>{source.status}</Badge></td><td className="p-3"><p>{source.lastInventoryStatus ?? "—"}</p><p className="text-xs text-muted-foreground">{formatDate(source.lastInventoryAt)}</p>{source.lastInventoryError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{source.lastInventoryError}</p>}</td><td className="p-3">{source.endpointCount}</td><td className="p-3">{source.unhealthyCount}</td><td className="p-3">
    <div className="flex items-center gap-2">
      {source.providerType === "THREE_X_UI" && <Input aria-label="Код страны" placeholder="Страна (DE)" className="w-20" value={countryCodes[source.id] ?? ""} onChange={(event) => setCountryCodes((value) => ({ ...value, [source.id]: event.target.value.toUpperCase() }))} />}
      <Button size="sm" variant="outline" disabled={syncingId === source.id} onClick={() => syncMutation.mutate({ id: source.id, countryCode: countryCodes[source.id] })}>Синхронизировать с панелью</Button>
    </div>
    {syncResult[source.id] && <p className="mt-1 text-xs text-muted-foreground">{syncResult[source.id]}</p>}
  </td></tr>)}</tbody></table></QueryMessage></CardContent></Card>;
}

function Pagination({ page, pages, onPrevious, onNext }: { page: number; pages: number; onPrevious: () => void; onNext: () => void }) {
  return <div className="mt-4 flex items-center justify-between"><Button variant="outline" disabled={page <= 1} onClick={onPrevious}>Назад</Button><span className="text-sm text-muted-foreground">{page} / {pages}</span><Button variant="outline" disabled={page >= pages} onClick={onNext}>Далее</Button></div>;
}
