"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CircleDollarSignIcon } from "lucide-react";
import { adminApi } from "@/api/client";
import { ErrorState } from "@/components/error-state";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { can } from "@/lib/access-control";

const windows = [
  { value: 7, label: "7 дней" },
  { value: 30, label: "30 дней" },
  { value: 90, label: "90 дней" },
] as const;
type Window = (typeof windows)[number]["value"];

export function ArpuLtvCards({ staff, brandCodes }: { staff: { permissions: string[] } | undefined; brandCodes?: string }) {
  const mayView = can(staff, "finance.read");
  const [days, setDays] = useState<Window>(30);

  const arpuLtv = useQuery({
    queryKey: ["admin-dashboard-arpu-ltv", brandCodes, days],
    queryFn: () => adminApi.getDashboardArpuLtv({ brandCodes, days }),
    enabled: mayView,
    retry: false,
  });

  if (!mayView) return null;

  const rows = arpuLtv.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="ARPU / LTV"
        description="Средний доход и пожизненная ценность клиента на брендо-валюту, снэпшот за окно"
        actions={
          <ToggleGroup
            variant="outline"
            spacing={0}
            value={[String(days)]}
            onValueChange={(values) => {
              const next = Number(values[0]);
              if (next === 7 || next === 30 || next === 90) setDays(next);
            }}
          >
            {windows.map((item) => (
              <ToggleGroupItem key={item.value} value={String(item.value)}>
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />
      {arpuLtv.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : arpuLtv.isError ? (
        <ErrorState description="Не удалось получить данные ARPU/LTV." />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет платящих клиентов за выбранное окно.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
          {rows.map((row) => (
            <StatCard
              key={row.currency}
              label={`ARPU / LTV, ${row.currency}`}
              icon={CircleDollarSignIcon}
              value={`${row.arpu.toFixed(2)} / ${row.ltv != null ? row.ltv.toFixed(2) : "—"}`}
              footer={
                row.ltv == null
                  ? `${row.payers} платящих клиентов · LTV не считается — в этом окне ни одна подписка не истекла`
                  : `${row.payers} платящих клиентов`
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
