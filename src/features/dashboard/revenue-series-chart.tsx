"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { adminApi } from "@/api/client";
import type { RevenueSeriesPoint } from "@/api/types";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { can } from "@/lib/access-control";

const intervals = [
  { value: "day", label: "День" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
] as const;
type Interval = (typeof intervals)[number]["value"];

const metrics = [
  { value: "mrr", label: "MRR" },
  { value: "rawAmount", label: "Факт" },
] as const;
type Metric = (typeof metrics)[number]["value"];

const CHART_DAYS = 90;
const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function formatBucket(bucket: string) {
  return new Date(bucket).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function pivotByCurrency(points: RevenueSeriesPoint[], metric: Metric) {
  const rows = new Map<string, Record<string, unknown>>();
  const currencies = new Set<string>();
  for (const point of points) {
    currencies.add(point.currency);
    const row = rows.get(point.bucket) ?? { bucket: point.bucket };
    row[point.currency] = point[metric];
    rows.set(point.bucket, row);
  }
  return {
    data: Array.from(rows.values()).sort((a, b) => String(a.bucket).localeCompare(String(b.bucket))),
    currencies: Array.from(currencies).sort(),
  };
}

export function RevenueSeriesChart({ staff, brandCodes }: { staff: { permissions: string[] } | undefined; brandCodes?: string }) {
  const mayView = can(staff, "finance.read");
  const [interval, setInterval] = useState<Interval>("day");
  const [metric, setMetric] = useState<Metric>("mrr");

  const series = useQuery({
    queryKey: ["admin-dashboard-revenue-series", brandCodes, interval],
    queryFn: () => adminApi.getDashboardRevenueSeries({ brandCodes, interval, days: CHART_DAYS }),
    enabled: mayView,
    retry: false,
  });

  const { data, currencies } = useMemo(() => pivotByCurrency(series.data ?? [], metric), [series.data, metric]);
  const config: ChartConfig = useMemo(
    () => Object.fromEntries(currencies.map((currency, index) => [currency, { label: currency, color: CHART_COLORS[index % CHART_COLORS.length] }])),
    [currencies],
  );

  if (!mayView) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Выручка во времени</CardTitle>
        <CardDescription>MRR — сумма нормализована к 30-дневному периоду, чтобы годовые продления не давали скачков; Факт — реально собранные деньги</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ToggleGroup
            variant="outline"
            spacing={0}
            value={[metric]}
            onValueChange={(values) => {
              const next = values[0];
              if (next === "mrr" || next === "rawAmount") setMetric(next);
            }}
          >
            {metrics.map((item) => (
              <ToggleGroupItem key={item.value} value={item.value}>
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
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
        </div>
        {series.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : series.isError ? (
          <ErrorState description="Не удалось получить данные о выручке." />
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Нет данных за выбранный период.</p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-64 w-full">
            <LineChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatBucket} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatBucket(String(value))} />} />
              {currencies.map((currency) => (
                <Line key={currency} dataKey={currency} type="monotone" stroke={`var(--color-${currency})`} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
