"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { InfrastructureEndpointSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { CountryFlag } from "@/components/country-flag";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { EndpointName } from "@/components/endpoint-name";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EndpointEditDialog } from "@/features/infrastructure/endpoint-edit-dialog";
import { can } from "@/lib/access-control";

const pageSize = 25;

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

const columns: ColumnDef<InfrastructureEndpointSummary>[] = [
  {
    accessorKey: "name",
    header: "Сервер",
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

export function ProtocolsPage() {
  const [page, setPage] = useState(1);
  const [sourceCode, setSourceCode] = useState("all");
  const [countryCode, setCountryCode] = useState("");
  const [protocol, setProtocol] = useState("");
  const [healthStatus, setHealthStatus] = useState("");
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>();

  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "infrastructure.write");
  const sources = useQuery({ queryKey: ["admin-infrastructure-sources"], queryFn: adminApi.listControlPlaneSources, retry: false });
  const endpointsForCountries = useQuery({ queryKey: ["admin-infrastructure-endpoints-all"], queryFn: () => adminApi.listInfrastructureEndpoints({ page: 1, pageSize: 100 }), retry: false });
  const endpointCountries = [...new Set((endpointsForCountries.data?.items ?? []).map((item) => item.countryCode).filter(Boolean))].sort();
  const endpoints = useQuery({
    queryKey: ["admin-infrastructure-endpoints", page, sourceCode, countryCode, protocol, healthStatus],
    queryFn: () =>
      adminApi.listInfrastructureEndpoints({
        page,
        pageSize,
        ...(sourceCode !== "all" ? { sourceCode } : {}),
        ...(countryCode ? { countryCode } : {}),
        ...(protocol ? { protocol } : {}),
        ...(healthStatus ? { healthStatus } : {}),
      }),
    retry: false,
  });
  const pageCount = Math.max(1, Math.ceil((endpoints.data?.total ?? 0) / (endpoints.data?.pageSize ?? pageSize)));

  return (
    <AppShell>
      <PageHeader
        title="Протоколы"
        description="Inbound'ы (протокольные endpoint'ы) по всем панелям — один физический сервер может показывать несколько строк, по одной на протокол"
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Select
          items={[{ value: "all", label: "Все панели" }, ...(sources.data?.map((source) => ({ value: source.code, label: source.code })) ?? [])]}
          value={sourceCode}
          onValueChange={(value) => { setSourceCode(value ?? "all"); setPage(1); }}
        >
          <SelectTrigger aria-label="Панель">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Панель</SelectLabel>
              <SelectItem value="all">Все панели</SelectItem>
              {sources.data?.map((source) => (
                <SelectItem key={source.id} value={source.code}>
                  {source.code}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          items={[{ value: "all", label: "Все страны" }, ...endpointCountries.map((code) => ({ value: code, label: code }))]}
          value={countryCode || "all"}
          onValueChange={(value) => { setCountryCode(value === "all" ? "" : (value ?? "")); setPage(1); }}
        >
          <SelectTrigger aria-label="Страна">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Страна</SelectLabel>
              <SelectItem value="all">Все страны</SelectItem>
              {endpointCountries.map((code) => (
                <SelectItem key={code} value={code}>
                  <CountryFlag code={code} className="mr-1" />
                  {code}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input aria-label="Протокол" placeholder="Протокол" value={protocol} onChange={(event) => { setProtocol(event.target.value); setPage(1); }} />
        <Input aria-label="Здоровье" placeholder="Например HEALTHY" value={healthStatus} onChange={(event) => { setHealthStatus(event.target.value); setPage(1); }} />
      </div>

      <DataTable
        columns={columns}
        data={endpoints.data?.items ?? []}
        isLoading={endpoints.isLoading}
        isError={endpoints.isError}
        errorMessage="Не удалось получить данные инфраструктуры."
        emptyMessage="Данные не найдены."
        onRowClick={(item) => setSelectedEndpointId(item.id)}
        isRowActive={(item) => item.id === selectedEndpointId}
      />
      <DataTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />

      <EndpointEditDialog
        endpoint={endpoints.data?.items.find((item) => item.id === selectedEndpointId)}
        onOpenChange={(open) => !open && setSelectedEndpointId(undefined)}
        mayWrite={mayWrite}
      />
    </AppShell>
  );
}
