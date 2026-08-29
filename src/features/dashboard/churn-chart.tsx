"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { adminApi } from "@/api/client";
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

const CHART_DAYS = 90;

const chartConfig = {
  churnRatePercent: { label: "Отток, %", color: "var(--chart-5)" },
} satisfies ChartConfig;

function formatBucket(bucket: string) {
  return new Date(bucket).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export function ChurnChart({ staff, brandCodes }: { staff: { permissions: string[] } | undefined; brandCodes?: string }) {
  const mayView = can(staff, "finance.read");
  const [interval, setInterval] = useState<Interval>("day");

  const series = useQuery({
    queryKey: ["admin-dashboard-churn-series", brandCodes, interval],
    queryFn: () => adminApi.getDashboardChurnSeries({ brandCodes, interval, days: CHART_DAYS }),
    enabled: mayView,
    retry: false,
  });

  if (!mayView) return null;

  const data = series.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Отток</CardTitle>
        <CardDescription>Доля подписок, у которых закончился период в бакете и которые так и не продлились на том же членстве</CardDescription>
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
          <ErrorState description="Не удалось получить данные об оттоке." />
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Нет данных за выбранный период.</p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <LineChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatBucket} />
              <YAxis tickLine={false} axisLine={false} width={40} unit="%" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => formatBucket(String(value))}
                    formatter={(value, _name, item) => (
                      <div className="flex w-full flex-col gap-0.5">
                        <span className="font-mono font-medium tabular-nums">{Number(value).toFixed(1)}%</span>
                        <span className="text-xs text-muted-foreground">
                          Истекло {item.payload.expiredCount}, ушло {item.payload.churnedCount}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Line dataKey="churnRatePercent" type="monotone" stroke="var(--color-churnRatePercent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
