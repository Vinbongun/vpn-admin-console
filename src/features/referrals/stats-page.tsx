"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { adminApi } from "@/api/client";
import type { ReferralPartnerStats } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";

function formatMoney(value: number, currency: string | null) {
  return currency ? `${value.toFixed(2)} ${currency}` : "—";
}

const columns: ColumnDef<ReferralPartnerStats>[] = [
  { accessorKey: "referralPartnerName", header: "Партнёр" },
  { accessorKey: "activeCodes", header: "Активных кодов" },
  { accessorKey: "redemptionsTotal", header: "Использований всего" },
  { accessorKey: "redemptionsThisMonth", header: "За этот месяц" },
  { id: "payoutPending", header: "Выплата в ожидании", cell: ({ row }) => formatMoney(row.original.payoutPending, row.original.currency) },
  { id: "payoutConfirmed", header: "Выплата подтверждена", cell: ({ row }) => formatMoney(row.original.payoutConfirmed, row.original.currency) },
];

export function ReferralsStatsPage() {
  const stats = useQuery({ queryKey: ["admin-referral-partner-stats"], queryFn: adminApi.getReferralPartnerStats, retry: false });

  return (
    <AppShell>
      <PageHeader title="Рефералы" description="Статистика использования промокодов и начислений по партнёрам" />
      <DataTable
        columns={columns}
        data={stats.data ?? []}
        isLoading={stats.isLoading}
        isError={stats.isError}
        errorMessage="Не удалось получить статистику."
        emptyMessage="Данных пока нет."
      />
    </AppShell>
  );
}
