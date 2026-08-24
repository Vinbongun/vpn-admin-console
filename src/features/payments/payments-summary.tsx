"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleDollarSignIcon, CircleXIcon, ClockIcon } from "lucide-react";
import { adminApi } from "@/api/client";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";

const periods = [
  { key: "today", label: "Сегодня" },
  { key: "last7d", label: "7 дней" },
  { key: "last30d", label: "30 дней" },
] as const;

export function PaymentsSummaryCards({ brandCodes }: { brandCodes?: string }) {
  const summary = useQuery({ queryKey: ["admin-payments-summary", brandCodes], queryFn: () => adminApi.getPaymentsSummary({ brandCodes }), retry: false });

  return (
    <div className="flex flex-col gap-4">
      {periods.map((period) => {
        const window = summary.data?.[period.key];
        const value = (n: number | undefined) => (summary.isLoading ? "…" : summary.isError ? "—" : (n ?? 0));
        return (
          <div key={period.key} className="flex flex-col gap-4">
            <SectionHeader title={period.label} />
            <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
              <StatCard label="В работе" icon={ClockIcon} value={value(window?.pending)} />
              <StatCard label="Успешно" icon={CircleDollarSignIcon} value={value(window?.succeeded)} />
              <StatCard label="Отменено" icon={CircleXIcon} value={value(window?.failed)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
