"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { adminApi } from "@/api/client";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { can } from "@/lib/access-control";

const views = [
  { value: "day", label: "DAU", days: 30 },
  { value: "week", label: "WAU", days: 180 },
  { value: "month", label: "MAU", days: 365 },
] as const;
type View = (typeof views)[number]["value"];

const chartConfig = {
  activeSubscriptions: { label: "Активные подписки", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatBucket(bucket: string, interval: View) {
  return new Date(bucket).toLocaleDateString("ru-RU", interval === "month" ? { year: "2-digit", month: "short" } : { day: "2-digit", month: "2-digit" });
}

export function ActiveUsersChart({ staff, brandCodes }: { staff: { permissions: string[] } | undefined; brandCodes?: string }) {
  const mayView = can(staff, "finance.read");
  const [view, setView] = useState<View>("day");
  const activeView = views.find((item) => item.value === view) ?? views[0];

  const series = useQuery({
    queryKey: ["admin-dashboard-active-users-series", brandCodes, view],
    queryFn: () => adminApi.getDashboardActiveUsersSeries({ brandCodes, interval: view, days: activeView.days }),
    enabled: mayView,
    retry: false,
  });

  if (!mayView) return null;

  const data = series.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Активные подписки во времени</CardTitle>
        <CardDescription>
          Считается по метке последней активности подписки (`last_active_at`), а не по логу активности за каждый день — исторические бакеты занижены, если клиент активен и сегодня, и вчера
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ToggleGroup
          variant="outline"
          spacing={0}
          value={[view]}
          onValueChange={(values) => {
            const next = values[0];
            if (next === "day" || next === "week" || next === "month") setView(next);
          }}
        >
          {views.map((item) => (
            <ToggleGroupItem key={item.value} value={item.value}>
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {series.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : series.isError ? (
          <ErrorState description="Не удалось получить данные об активности." />
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Нет данных за выбранный период.</p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <AreaChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => formatBucket(value, view)} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatBucket(String(value), view)} />} />
              <Area dataKey="activeSubscriptions" type="monotone" fill="var(--color-activeSubscriptions)" fillOpacity={0.3} stroke="var(--color-activeSubscriptions)" />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
