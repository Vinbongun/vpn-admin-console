"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { adminApi } from "@/api/client";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { can } from "@/lib/access-control";

const intervals = [
  { value: "day", label: "День" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
] as const;
type Interval = (typeof intervals)[number]["value"];

const CHART_DAYS = 90;

const chartConfig = {
  redemptions: { label: "Активации", color: "var(--chart-2)" },
  payoutTotal: { label: "Начислено выплат", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatBucket(bucket: string) {
  return new Date(bucket).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export function ReferralFunnelChart({ staff, brandCodes }: { staff: { permissions: string[] } | undefined; brandCodes?: string }) {
  const mayView = can(staff, "finance.read");
  const [interval, setInterval] = useState<Interval>("day");

  const series = useQuery({
    queryKey: ["admin-dashboard-referral-funnel-series", brandCodes, interval],
    queryFn: () => adminApi.getDashboardReferralFunnelSeries({ brandCodes, interval, days: CHART_DAYS }),
    enabled: mayView,
    retry: false,
  });

  const data = useMemo(
    () => (series.data ?? []).map((point) => ({ ...point, payoutTotal: point.payoutPending + point.payoutConfirmed })),
    [series.data],
  );
  const currency = series.data?.find((point) => point.currency)?.currency;

  if (!mayView) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Реферальная воронка во времени</CardTitle>
        <CardDescription>Активации реферальных кодов и объём начисленных выплат{currency ? ` (${currency})` : ""} — временной ряд к снэпшоту на странице «Рефералы → Статистика»</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ToggleGroup
          variant="outline"
          spacing={0}
          value={[interval]}
          onValueChange={(values) => {
            const next = values[0];
            if (next === "day" || next === "week" || next === "month") setInterval(next);
          }}
        >
          {intervals.map((item) => (
            <ToggleGroupItem key={item.value} value={item.value}>
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {series.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : series.isError ? (
          <ErrorState description="Не удалось получить данные по рефералам." />
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Нет данных за выбранный период.</p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <ComposedChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatBucket} />
              <YAxis yAxisId="count" tickLine={false} axisLine={false} width={40} />
              <YAxis yAxisId="amount" orientation="right" tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatBucket(String(value))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar yAxisId="count" dataKey="redemptions" fill="var(--color-redemptions)" radius={4} />
              <Line yAxisId="amount" dataKey="payoutTotal" type="monotone" stroke="var(--color-payoutTotal)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
