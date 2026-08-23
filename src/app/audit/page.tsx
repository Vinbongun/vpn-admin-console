"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { AuditEventSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const columns: ColumnDef<AuditEventSummary>[] = [
  { id: "occurredAt", header: "Время", cell: ({ row }) => new Date(row.original.occurredAt).toLocaleString("ru-RU") },
  { accessorKey: "action", header: "Действие", cell: ({ row }) => <span className="font-medium">{row.original.action}</span> },
  { id: "actor", header: "Инициатор", cell: ({ row }) => row.original.actorType + (row.original.actorId ? ` · ${row.original.actorId}` : "") },
  { id: "resource", header: "Ресурс", cell: ({ row }) => row.original.resourceType + (row.original.resourceId ? ` · ${row.original.resourceId}` : "") },
  { id: "reason", header: "Причина", cell: ({ row }) => row.original.reason ?? "—" },
];

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const events = useQuery({ queryKey: ["admin-audit", page, action, resourceType], queryFn: () => adminApi.listAuditEvents({ page, pageSize: 25, ...(action ? { action } : {}), ...(resourceType ? { resourceType } : {}) }), retry: false });
  const totalPages = Math.max(1, Math.ceil((events.data?.total ?? 0) / (events.data?.pageSize ?? 25)));

  return (
    <AppShell>
      <PageHeader title="Аудит" description="Кто и что изменил в системе — без содержимого чувствительных данных, только метаданные события" />
      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-2">
          <Input aria-label="Фильтр по действию" placeholder="Действие, например brand.created" value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} />
          <Input aria-label="Фильтр по ресурсу" placeholder="Тип ресурса, например plan" value={resourceType} onChange={(event) => { setResourceType(event.target.value); setPage(1); }} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>События</CardTitle>
          <CardDescription>Журнал административных действий: кто, что и над каким ресурсом изменил</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={events.data?.items ?? []} isLoading={events.isLoading} isError={events.isError} errorMessage="Не удалось получить события аудита." emptyMessage="События не найдены." />
          <DataTablePagination page={page} pageCount={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
