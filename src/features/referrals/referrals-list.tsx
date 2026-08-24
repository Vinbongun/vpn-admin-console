"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { AdminReferralQuery, ReferralSummary } from "@/api/types";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { PageToolbar } from "@/components/page-toolbar";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { referralStatuses } from "@/features/referrals/schema";

const pageSize = 25;

const columns: ColumnDef<ReferralSummary>[] = [
  { id: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { id: "rewardAmount", header: "Награда", cell: ({ row }) => `${row.original.rewardAmount} ${row.original.rewardCurrency}` },
  { id: "createdAt", header: "Создано", cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("ru-RU") },
  { id: "confirmedAt", header: "Подтверждено", cell: ({ row }) => (row.original.confirmedAt ? new Date(row.original.confirmedAt).toLocaleString("ru-RU") : "—") },
];

export function ReferralsList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");

  const referrals = useQuery({
    queryKey: ["admin-referrals", page, status],
    queryFn: () => adminApi.listReferrals({ page, pageSize, ...(status !== "all" ? { status: status as AdminReferralQuery["status"] } : {}) }),
    retry: false,
  });

  const totalPages = Math.max(1, Math.ceil((referrals.data?.total ?? 0) / (referrals.data?.pageSize ?? pageSize)));

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Начисления" description="Реферальные вознаграждения по всем программам" />
      <PageToolbar>
        <Select
          items={[{ value: "all", label: "Все статусы" }, ...referralStatuses.map((value) => ({ value, label: value }))]}
          value={status}
          onValueChange={(value) => { setStatus(value ?? "all"); setPage(1); }}
        >
          <SelectTrigger className="w-40" aria-label="Статус">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {referralStatuses.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageToolbar>
      <DataTable
        columns={columns}
        data={referrals.data?.items ?? []}
        isLoading={referrals.isLoading}
        isError={referrals.isError}
        errorMessage="Не удалось получить начисления."
        emptyMessage="Начислений не найдено."
      />
      <DataTablePagination page={page} pageCount={totalPages} onPageChange={setPage} />
    </div>
  );
}
