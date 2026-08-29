"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { adminApi } from "@/api/client";
import type { InfraHealthSeriesPoint } from "@/api/types";
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
  INFO: { label: "Открыто: инфо", color: "var(--chart-3)" },
  WARNING: { label: "Открыто: предупреждение", color: "var(--chart-4)" },
  CRITICAL: { label: "Открыто: критично", color: "var(--chart-5)" },
  resolved: { label: "Закрыто", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatBucket(bucket: string) {
  return new Date(bucket).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

// Pivots one row per (bucket, severity) into one row per bucket with per-severity `opened` columns,
// plus a `resolved` total across severities for the line overlay.
function pivotBySeverity(points: InfraHealthSeriesPoint[]) {
  const rows = new Map<string, Record<string, unknown>>();
  for (const point of points) {
    const row = rows.get(point.bucket) ?? { bucket: point.bucket, resolved: 0 };
    row[point.severity] = point.opened;
    row.resolved = (row.resolved as number) + point.resolved;
    rows.set(point.bucket, row);
  }
  return Array.from(rows.values()).sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)));
}

export function InfraHealthChart({ staff }: { staff: { permissions: string[] } | undefined }) {
  const mayView = can(staff, "infrastructure.read");
  const [interval, setInterval] = useState<Interval>("day");

  const series = useQuery({
    queryKey: ["admin-dashboard-infra-health-series", interval],
    queryFn: () => adminApi.getDashboardInfraHealthSeries({ interval, days: CHART_DAYS }),
    enabled: mayView,
    retry: false,
  });

  const data = useMemo(() => pivotBySeverity(series.data ?? []), [series.data]);

  if (!mayView) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Здоровье инфраструктуры во времени</CardTitle>
        <CardDescription>Открытые и закрытые инциденты по эндпоинтам — тренд, не текущий снэпшот (для снэпшота есть страница инфраструктуры)</CardDescription>
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
          <ErrorState description="Не удалось получить данные о здоровье инфраструктуры." />
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Инцидентов за выбранный период не было.</p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <ComposedChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatBucket} />
              <YAxis tickLine={false} axisLine={false} width={40} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatBucket(String(value))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="INFO" stackId="opened" fill="var(--color-INFO)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="WARNING" stackId="opened" fill="var(--color-WARNING)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="CRITICAL" stackId="opened" fill="var(--color-CRITICAL)" radius={[4, 4, 0, 0]} />
              <Line dataKey="resolved" type="monotone" stroke="var(--color-resolved)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
