"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { CohortRetentionRow } from "@/api/types";
import { ErrorState } from "@/components/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { can } from "@/lib/access-control";

const monthWindows = [
  { value: 3, label: "3 мес" },
  { value: 6, label: "6 мес" },
  { value: 12, label: "12 мес" },
] as const;

function formatCohortMonth(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", { year: "numeric", month: "short" });
}

function cellFor(row: CohortRetentionRow, monthOffset: number) {
  return row.retention.find((entry) => entry.monthOffset === monthOffset);
}

export function CohortRetentionHeatmap({ staff, brandCodes }: { staff: { permissions: string[] } | undefined; brandCodes?: string }) {
  const mayView = can(staff, "finance.read");
  const [months, setMonths] = useState<(typeof monthWindows)[number]["value"]>(6);

  const cohorts = useQuery({
    queryKey: ["admin-dashboard-cohort-retention", brandCodes, months],
    queryFn: () => adminApi.getDashboardCohortRetention({ brandCodes, months }),
    enabled: mayView,
    retry: false,
  });

  if (!mayView) return null;

  const rows = [...(cohorts.data ?? [])].sort((a, b) => b.cohortMonth.localeCompare(a.cohortMonth));
  const offsets = Array.from({ length: months }, (_, index) => index);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ретеншен по когортам</CardTitle>
        <CardDescription>Строки — месяц регистрации, столбцы — месяцы с момента регистрации. Пустая ячейка — когорта ещё не дожила до этого месяца, а не 0%</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ToggleGroup
          variant="outline"
          spacing={0}
          value={[String(months)]}
          onValueChange={(values) => {
            const next = Number(values[0]);
            if (next === 3 || next === 6 || next === 12) setMonths(next);
          }}
        >
          {monthWindows.map((item) => (
            <ToggleGroupItem key={item.value} value={String(item.value)}>
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {cohorts.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : cohorts.isError ? (
          <ErrorState description="Не удалось получить данные по когортам." />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Нет когорт за выбранный период.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Когорта</TableHead>
                <TableHead className="text-right">Размер</TableHead>
                {offsets.map((offset) => (
                  <TableHead key={offset} className="text-center">
                    +{offset} мес
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.cohortMonth}>
                  <TableCell className="font-medium capitalize">{formatCohortMonth(row.cohortMonth)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{row.cohortSize}</TableCell>
                  {offsets.map((offset) => {
                    const cell = cellFor(row, offset);
                    return (
                      <TableCell
                        key={offset}
                        className="text-center tabular-nums"
                        style={cell ? { backgroundColor: `color-mix(in oklab, var(--chart-1) ${Math.max(0, Math.min(100, cell.retentionPercent))}%, transparent)` } : undefined}
                      >
                        {cell ? `${cell.retentionPercent.toFixed(0)}%` : ""}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
