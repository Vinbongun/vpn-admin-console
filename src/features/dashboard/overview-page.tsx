"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CircleDollarSign, UserCheck, UserPlus, Users, UserX } from "lucide-react";
import { useState } from "react";
import { adminApi } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { BrandFilter } from "@/components/brand-filter";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ActiveUsersChart } from "@/features/dashboard/active-users-chart";
import { ArpuLtvCards } from "@/features/dashboard/arpu-ltv-cards";
import { ChurnChart } from "@/features/dashboard/churn-chart";
import { CohortRetentionHeatmap } from "@/features/dashboard/cohort-retention-heatmap";
import { ConversionChart } from "@/features/dashboard/conversion-chart";
import { InfraHealthChart } from "@/features/dashboard/infra-health-chart";
import { ReferralFunnelChart } from "@/features/dashboard/referral-funnel-chart";
import { RevenueSeriesChart } from "@/features/dashboard/revenue-series-chart";
import { RetentionSection } from "@/features/retention/retention-section";
import { useBrandFilter } from "@/hooks/use-brand-filter";
import { can } from "@/lib/access-control";
import { formatCurrencyAmounts } from "@/lib/format-currency";

const newCustomerPeriods = [
  { value: "day", label: "День" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "year", label: "Год" },
] as const;
type NewCustomerPeriod = (typeof newCustomerPeriods)[number]["value"];

export function OverviewPage() {
  const { selected, setSelected, brandCodes } = useBrandFilter();
  const [newCustomerPeriod, setNewCustomerPeriod] = useState<NewCustomerPeriod>("month");
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

          <SectionHeader
            title="Новые клиенты"
            description="Регистрации и первые оплаты за выбранный период"
            actions={
              <ToggleGroup
                variant="outline"
                spacing={0}
                value={[newCustomerPeriod]}
                onValueChange={(values) => {
                  const next = values[0];
                  if (next === "day" || next === "week" || next === "month" || next === "year") setNewCustomerPeriod(next);
                }}
              >
                {newCustomerPeriods.map((period) => (
                  <ToggleGroupItem key={period.value} value={period.value}>
                    {period.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            }
          />
          <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
            <StatCard label="Новые регистрации" icon={UserPlus} value={num(overview.data?.newRegistrations[newCustomerPeriod])} />
            <StatCard label="Новые платящие клиенты" icon={UserCheck} value={num(overview.data?.newPayingCustomers[newCustomerPeriod])} />
          </div>

          <SectionHeader title="Скоро закончится" description="Активные и пробные подписки с истечением в ближайшее время" />
          <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
            <StatCard label="7 дней" icon={CalendarClock} value={num(overview.data?.expiringSoon.in7d)} />
            <StatCard label="14 дней" icon={CalendarClock} value={num(overview.data?.expiringSoon.in14d)} />
            <StatCard label="30 дней" icon={CalendarClock} value={num(overview.data?.expiringSoon.in30d)} />
          </div>

          <SectionHeader title="Динамика" description="Ключевые показатели во времени — расширение сводки выше" />
          <RevenueSeriesChart staff={staff.data} brandCodes={brandCodes} />
          <CohortRetentionHeatmap staff={staff.data} brandCodes={brandCodes} />
          <ActiveUsersChart staff={staff.data} brandCodes={brandCodes} />
          <ConversionChart staff={staff.data} brandCodes={brandCodes} />
          <ChurnChart staff={staff.data} brandCodes={brandCodes} />
          <ArpuLtvCards staff={staff.data} brandCodes={brandCodes} />
          <ReferralFunnelChart staff={staff.data} brandCodes={brandCodes} />
        </>
      )}

      <RetentionSection staff={staff.data} brandCodes={brandCodes} />
      <InfraHealthChart staff={staff.data} />
    </AppShell>
  );
}
