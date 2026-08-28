"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { AdminInfrastructureIncidentQuery, InfrastructureIncidentSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { EndpointName } from "@/components/endpoint-name";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

const pageSize = 25;

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

const columns: ColumnDef<InfrastructureIncidentSummary>[] = [
  { id: "openedAt", header: "Открыт", cell: ({ row }) => formatDate(row.original.openedAt) },
  { id: "severity", header: "Критичность", cell: ({ row }) => <Badge>{row.original.severity}</Badge> },
  { id: "status", header: "Статус", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
  { accessorKey: "kind", header: "Тип" },
  { id: "endpointName", header: "Сервер", cell: ({ row }) => (row.original.endpointName ? <EndpointName name={row.original.endpointName} /> : "—") },
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

export function IncidentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AdminInfrastructureIncidentQuery["status"] | "all">("all");
  const [severity, setSeverity] = useState<AdminInfrastructureIncidentQuery["severity"] | "all">("all");

  const incidents = useQuery({
    queryKey: ["admin-infrastructure-incidents", page, status, severity],
    queryFn: () =>
      adminApi.listInfrastructureIncidents({
        page,
        pageSize,
        ...(status !== "all" ? { status } : {}),
        ...(severity !== "all" ? { severity } : {}),
      }),
    retry: false,
  });
  const pageCount = Math.max(1, Math.ceil((incidents.data?.total ?? 0) / (incidents.data?.pageSize ?? pageSize)));

  return (
    <AppShell>
      <PageHeader title="Инциденты" description="История проблем с endpoint'ами — от временной деградации до полной недоступности" />

      <div className="grid gap-3 md:grid-cols-2">
        <Select
          items={[
            { value: "all", label: "Все статусы" },
            { value: "OPEN", label: "OPEN" },
            { value: "ACKNOWLEDGED", label: "ACKNOWLEDGED" },
            { value: "RESOLVED", label: "RESOLVED" },
          ]}
          value={status}
          onValueChange={(value) => { setStatus(value as typeof status); setPage(1); }}
        >
          <SelectTrigger aria-label="Статус инцидента">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Статус инцидента</SelectLabel>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="OPEN">OPEN</SelectItem>
              <SelectItem value="ACKNOWLEDGED">ACKNOWLEDGED</SelectItem>
              <SelectItem value="RESOLVED">RESOLVED</SelectItem>
            </SelectGroup>
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
          onValueChange={(value) => { setSeverity(value as typeof severity); setPage(1); }}
        >
          <SelectTrigger aria-label="Критичность">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Критичность</SelectLabel>
              <SelectItem value="all">Любая критичность</SelectItem>
              <SelectItem value="INFO">INFO</SelectItem>
              <SelectItem value="WARNING">WARNING</SelectItem>
              <SelectItem value="CRITICAL">CRITICAL</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={incidents.data?.items ?? []}
        isLoading={incidents.isLoading}
        isError={incidents.isError}
        errorMessage="Не удалось получить данные инфраструктуры."
        emptyMessage="Данные не найдены."
      />
      <DataTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </AppShell>
  );
}
