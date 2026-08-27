"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { PaymentGatewayLog } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logEventTypes, logLevels } from "@/features/payments/schema";

const pageSize = 25;

const eventTypeLabels: Record<string, string> = {
  CHARGE_ATTEMPT: "Попытка списания",
  CHARGE_RESULT: "Результат списания",
  REFUND_REQUESTED: "Запрошен возврат",
  REFUND_RESULT: "Результат возврата",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
}

function toIso(datetimeLocal: string): string | undefined {
  if (!datetimeLocal) return undefined;
  const date = new Date(datetimeLocal);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const columns: ColumnDef<PaymentGatewayLog>[] = [
  { id: "createdAt", header: "Дата", cell: ({ row }) => formatDate(row.original.createdAt) },
  { id: "level", header: "Уровень", cell: ({ row }) => <StatusBadge status={row.original.level} /> },
  { id: "eventType", header: "Событие", cell: ({ row }) => eventTypeLabels[row.original.eventType] ?? row.original.eventType },
  { accessorKey: "message", header: "Сообщение" },
  { id: "paymentIntentId", header: "Платёж", cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.paymentIntentId}</span> },
];

export default function PaymentLogsPage() {
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const logs = useQuery({
    queryKey: ["admin-payment-logs", page, level, eventType, paymentIntentId, dateFrom, dateTo],
    queryFn: () =>
      adminApi.listPaymentLogs({
        page,
        pageSize,
        ...(level !== "all" ? { level: level as (typeof logLevels)[number] } : {}),
        ...(eventType !== "all" ? { eventType: eventType as (typeof logEventTypes)[number] } : {}),
        ...(paymentIntentId ? { paymentIntentId } : {}),
        ...(toIso(dateFrom) ? { dateFrom: toIso(dateFrom) } : {}),
        ...(toIso(dateTo) ? { dateTo: toIso(dateTo) } : {}),
      }),
    retry: false,
  });

  const totalPages = Math.max(1, Math.ceil((logs.data?.total ?? 0) / (logs.data?.pageSize ?? pageSize)));
  const resetPage = () => setPage(1);

  return (
    <AppShell>
      <PageHeader title="Логи платежей" description="Общий поток событий платёжного шлюза по всем платежам" />
      <Card>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Select
              items={[{ value: "all", label: "Все уровни" }, ...logLevels.map((value) => ({ value, label: value }))]}
              value={level}
              onValueChange={(value) => { setLevel(value ?? "all"); resetPage(); }}
            >
              <SelectTrigger aria-label="Уровень">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Уровень</SelectLabel>
                  <SelectItem value="all">Все уровни</SelectItem>
                  {logLevels.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              items={[{ value: "all", label: "Все события" }, ...logEventTypes.map((value) => ({ value, label: eventTypeLabels[value] ?? value }))]}
              value={eventType}
              onValueChange={(value) => { setEventType(value ?? "all"); resetPage(); }}
            >
              <SelectTrigger aria-label="Тип события">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Тип события</SelectLabel>
                  <SelectItem value="all">Все события</SelectItem>
                  {logEventTypes.map((value) => (
                    <SelectItem key={value} value={value}>
                      {eventTypeLabels[value] ?? value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Input aria-label="ID платежа" placeholder="ID платежа" value={paymentIntentId} onChange={(event) => { setPaymentIntentId(event.target.value); resetPage(); }} />
            <Input aria-label="Дата от" type="datetime-local" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); resetPage(); }} />
            <Input aria-label="Дата до" type="datetime-local" value={dateTo} onChange={(event) => { setDateTo(event.target.value); resetPage(); }} />
          </div>
          <DataTable
            columns={columns}
            data={logs.data?.items ?? []}
            isLoading={logs.isLoading}
            isError={logs.isError}
            errorMessage="Не удалось получить логи."
            emptyMessage="Логи не найдены."
          />
          <DataTablePagination page={page} pageCount={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
