"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckIcon, KeyRoundIcon, RefreshCwIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsInstance } from "@/api/types";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { AddVpsDialog } from "@/features/vps/add-vps-dialog";
import { can } from "@/lib/access-control";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formatMoney(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

function expiresSoon(expireDate?: string | null) {
  if (!expireDate) return false;
  const days = (new Date(expireDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 14;
}

const statuses: VpsInstance["status"][] = ["PENDING", "ACTIVE", "UNREACHABLE", "DECOMMISSIONED"];

const columns: ColumnDef<VpsInstance>[] = [
  { accessorKey: "code", header: "Код", cell: ({ row }) => <span className="font-medium">{row.original.code}</span> },
  { accessorKey: "host", header: "Хост" },
  { id: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  {
    id: "providerType",
    header: "Способ добавления",
    cell: ({ row }) => <Badge variant="outline">{row.original.providerType === "MANUAL" ? "Вручную" : `Через API (${row.original.providerType})`}</Badge>,
  },
  {
    id: "cost",
    header: "Стоимость",
    cell: ({ row }) => (row.original.purchaseCostCents != null && row.original.currency ? formatMoney(row.original.purchaseCostCents, row.original.currency) : "—"),
  },
  {
    id: "expireDate",
    header: "Истекает",
    cell: ({ row }) => <span className={expiresSoon(row.original.expireDate) ? "text-destructive" : undefined}>{formatDate(row.original.expireDate)}</span>,
  },
  {
    id: "autoProlong",
    header: "Авто-продл.",
    cell: ({ row }) => (row.original.autoProlong ? <CheckIcon className="size-4 text-muted-foreground" /> : <XIcon className="size-4 text-muted-foreground" />),
  },
];

export function VpsListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<VpsInstance["status"] | "all">("all");

  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "vps.write");
  const vpsInstances = useQuery({
    queryKey: ["admin-vps-instances", statusFilter],
    queryFn: () => adminApi.listVpsInstances(statusFilter !== "all" ? { status: statusFilter } : {}),
    retry: false,
  });

  const healthCheckAllMutation = useMutation({
    mutationFn: () => adminApi.healthCheckAllVpsInstances(),
    onSuccess: async (result) => {
      toast.success(`Задач поставлено: ${result.enqueued}.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-vps-instances"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось поставить задачи проверки."),
  });

  const counts = new Map(statuses.map((status) => [status, 0]));
  for (const vps of vpsInstances.data ?? []) counts.set(vps.status, (counts.get(vps.status) ?? 0) + 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>VPS-серверы</CardTitle>
        <CardDescription>Физические серверы — один сервер либо обслуживает панель, либо зарегистрирован отдельно</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" render={<Link href="/infrastructure/vps-registrars" />} nativeButton={false}>
              <KeyRoundIcon />
              Регистраторы VPS
            </Button>
            {mayWrite && (
              <Button size="sm" variant="outline" disabled={healthCheckAllMutation.isPending} onClick={() => healthCheckAllMutation.mutate()}>
                {healthCheckAllMutation.isPending ? <Spinner /> : <RefreshCwIcon />}
                Обновить все VPS
              </Button>
            )}
            {mayWrite && <AddVpsDialog />}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 @xl/main:grid-cols-4">
          {statuses.map((status) => (
            <StatCard key={status} label={status} value={vpsInstances.isLoading ? "…" : (counts.get(status) ?? 0)} />
          ))}
        </div>

        <div className="max-w-64">
          <Select
            items={[{ value: "all", label: "Все статусы" }, ...statuses.map((status) => ({ value: status, label: status }))]}
            value={statusFilter}
            onValueChange={(value) => setStatusFilter((value as typeof statusFilter) ?? "all")}
          >
            <SelectTrigger aria-label="Статус VPS">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Статус</SelectLabel>
                <SelectItem value="all">Все статусы</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={vpsInstances.data ?? []}
          isLoading={vpsInstances.isLoading}
          isError={vpsInstances.isError}
          errorMessage="Не удалось получить список VPS."
          emptyMessage="VPS не найдены."
          onRowClick={(vps) => router.push(`/infrastructure/vps/${vps.id}`)}
        />
      </CardContent>
    </Card>
  );
}
