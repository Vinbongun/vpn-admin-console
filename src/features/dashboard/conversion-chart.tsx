"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
  registrations: { label: "Регистрации", color: "var(--chart-2)" },
  conversions: { label: "Конверсии", color: "var(--chart-1)" },
  conversionRatePercent: { label: "Конверсия, %", color: "var(--chart-4)" },
} satisfies ChartConfig;

function formatBucket(bucket: string) {
  return new Date(bucket).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export function ConversionChart({ staff, brandCodes }: { staff: { permissions: string[] } | undefined; brandCodes?: string }) {
  const mayView = can(staff, "finance.read");
  const [interval, setInterval] = useState<Interval>("day");

  const series = useQuery({
    queryKey: ["admin-dashboard-conversion-series", brandCodes, interval],
    queryFn: () => adminApi.getDashboardConversionSeries({ brandCodes, interval, days: CHART_DAYS }),
    enabled: mayView,
    retry: false,
  });

  if (!mayView) return null;

  const data = series.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Конверсия из регистрации в оплату</CardTitle>
        <CardDescription>Доля зарегистрировавшихся в бакете, кто когда-либо (не обязательно сразу) сделал первую платную оплату</CardDescription>
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
          <ErrorState description="Не удалось получить данные о конверсии." />
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Нет данных за выбранный период.</p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <ComposedChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatBucket} />
              <YAxis yAxisId="count" tickLine={false} axisLine={false} width={40} />
              <YAxis yAxisId="rate" orientation="right" tickLine={false} axisLine={false} width={40} unit="%" />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatBucket(String(value))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar yAxisId="count" dataKey="registrations" fill="var(--color-registrations)" radius={4} />
              <Bar yAxisId="count" dataKey="conversions" fill="var(--color-conversions)" radius={4} />
              <Line yAxisId="rate" dataKey="conversionRatePercent" type="monotone" stroke="var(--color-conversionRatePercent)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
