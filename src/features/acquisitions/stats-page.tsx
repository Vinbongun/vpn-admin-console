"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { adminApi } from "@/api/client";
import type { AcquisitionStatsRow } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { BrandFilter } from "@/components/brand-filter";
import { DataTable } from "@/components/data-table";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { useBrandFilter } from "@/hooks/use-brand-filter";
import { can } from "@/lib/access-control";
import { formatCurrencyAmounts } from "@/lib/format-currency";

const columns: ColumnDef<AcquisitionStatsRow>[] = [
  { id: "utmSource", header: "Источник", cell: ({ row }) => (row.original.isOrganic ? "Органика / без метки" : (row.original.utmSource ?? "—")) },
  { id: "utmMedium", header: "Канал", cell: ({ row }) => row.original.utmMedium ?? "—" },
  { id: "utmCampaign", header: "Кампания", cell: ({ row }) => row.original.utmCampaign ?? "—" },
  { accessorKey: "registrations", header: "Регистрации" },
  { accessorKey: "conversions", header: "Конверсии" },
  { id: "revenue", header: "Выручка", cell: ({ row }) => formatCurrencyAmounts(row.original.revenue) },
];

export function AcquisitionStatsPage() {
  const { selected, setSelected, brandCodes } = useBrandFilter();
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayView = can(staff.data, "finance.read");

  const stats = useQuery({
    queryKey: ["admin-acquisition-stats", brandCodes],
    queryFn: () => adminApi.getAcquisitionStats({ brandCodes }),
    enabled: mayView,
    retry: false,
  });

  return (
    <AppShell>
      <PageHeader
        title="Каналы привлечения"
        description="Регистрации, конверсии в оплату и выручка по UTM-меткам первого захода клиента"
        actions={<BrandFilter selected={selected} onChange={setSelected} />}
      />

      {!staff.isLoading && !mayView ? (
        <ErrorState title="Недостаточно прав" description="Для просмотра каналов привлечения нужно право finance.read." />
      ) : (
        <DataTable
          columns={columns}
          data={stats.data ?? []}
          isLoading={stats.isLoading}
          isError={stats.isError}
          errorMessage="Не удалось получить статистику по каналам."
          emptyMessage="Данных пока нет."
        />
      )}
    </AppShell>
  );
}
