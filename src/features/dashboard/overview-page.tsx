"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CircleDollarSign, UserCheck, Users, UserX } from "lucide-react";
import { adminApi } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { BrandFilter } from "@/components/brand-filter";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { RetentionSection } from "@/features/retention/retention-section";
import { useBrandFilter } from "@/hooks/use-brand-filter";
import { can } from "@/lib/access-control";
import { formatCurrencyAmounts } from "@/lib/format-currency";

export function OverviewPage() {
  const { selected, setSelected, brandCodes } = useBrandFilter();
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayView = can(staff.data, "finance.read");

  const overview = useQuery({
    queryKey: ["admin-dashboard-overview", brandCodes],
    queryFn: () => adminApi.getDashboardOverview({ brandCodes }),
    enabled: mayView,
    retry: false,
  });

  const num = (value: number | undefined) => (overview.isLoading ? "…" : overview.isError ? "—" : (value ?? 0));

  return (
    <AppShell>
      <PageHeader
        title="Обзор платформы"
        description="Выручка, клиенты и подписки — ключевые показатели платформы"
        actions={<BrandFilter selected={selected} onChange={setSelected} />}
      />

      {!staff.isLoading && !mayView ? (
        <ErrorState title="Недостаточно прав" description="Для просмотра сводки по платформе нужно право finance.read." />
      ) : (
        <>
          <SectionHeader title="Выручка" />
          <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
            <StatCard label="Сегодня" icon={CircleDollarSign} value={overview.isLoading ? "…" : overview.isError ? "—" : formatCurrencyAmounts(overview.data?.revenue.today)} />
            <StatCard label="7 дней" icon={CircleDollarSign} value={overview.isLoading ? "…" : overview.isError ? "—" : formatCurrencyAmounts(overview.data?.revenue.last7d)} />
            <StatCard label="30 дней" icon={CircleDollarSign} value={overview.isLoading ? "…" : overview.isError ? "—" : formatCurrencyAmounts(overview.data?.revenue.last30d)} />
          </div>

          <SectionHeader title="Клиенты" />
          <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
            <StatCard label="Всего" icon={Users} value={num(overview.data?.clients.total)} />
            <StatCard label="Платят" icon={UserCheck} value={num(overview.data?.clients.paying)} />
            <StatCard label="Не платят" icon={UserX} value={num(overview.data?.clients.notPaying)} />
          </div>

          <SectionHeader title="Скоро закончится" description="Активные и пробные подписки с истечением в ближайшее время" />
          <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
            <StatCard label="7 дней" icon={CalendarClock} value={num(overview.data?.expiringSoon.in7d)} />
            <StatCard label="14 дней" icon={CalendarClock} value={num(overview.data?.expiringSoon.in14d)} />
            <StatCard label="30 дней" icon={CalendarClock} value={num(overview.data?.expiringSoon.in30d)} />
          </div>
        </>
      )}

      <RetentionSection staff={staff.data} brandCodes={brandCodes} />
    </AppShell>
  );
}
