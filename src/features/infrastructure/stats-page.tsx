"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { AdminPopularityQuery } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { EndpointName } from "@/components/endpoint-name";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

export function StatsPage() {
  const [mode, setMode] = useState<"assigned" | "live">("assigned");
  const [days, setDays] = useState("7");
  const popularity = useQuery({
    queryKey: ["admin-dashboard-popularity", mode, days],
    queryFn: () => adminApi.getDashboardPopularity({ mode, ...(mode === "live" ? { days: Number(days) } : {}) } satisfies AdminPopularityQuery),
    retry: false,
  });

  const servers = (popularity.data?.servers ?? []).filter((server) => server.name);
  const protocols = popularity.data?.protocols ?? [];
  const countFor = (item: { subscriptionCount?: number; sampleCount?: number }) => (mode === "assigned" ? (item.subscriptionCount ?? 0) : (item.sampleCount ?? 0));

  return (
    <AppShell>
      <PageHeader title="Статистика" description="Популярность серверов и протоколов — топ по назначению или по реальному использованию" />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          items={[
            { value: "assigned", label: "По назначению" },
            { value: "live", label: "По реальному использованию" },
          ]}
          value={mode}
          onValueChange={(value) => setMode((value as "assigned" | "live") ?? "assigned")}
        >
          <SelectTrigger aria-label="Режим" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Режим</SelectLabel>
              <SelectItem value="assigned">По назначению</SelectItem>
              <SelectItem value="live">По реальному использованию</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {mode === "live" && (
          <Select items={[{ value: "7", label: "7 дней" }, { value: "30", label: "30 дней" }]} value={days} onValueChange={(value) => setDays(value ?? "7")}>
            <SelectTrigger aria-label="Окно, дней" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Окно, дней</SelectLabel>
                <SelectItem value="7">7 дней</SelectItem>
                <SelectItem value="30">30 дней</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {mode === "assigned"
          ? "На скольких активных подписках сейчас реально назначен сервер/протокол — точное число, без задержки."
          : `Сколько раз за последние ${days} дней сервер/протокол видели активным по данным фонового опроса — относительный рейтинг, не точное число уникальных пользователей.`}
      </p>

      {popularity.isLoading ? (
        <LoadingState />
      ) : popularity.isError ? (
        <ErrorState description="Не удалось получить статистику популярности." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Топ серверов</p>
            {servers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Данных нет.</p>
            ) : (
              <div className="space-y-2">
                {servers.map((server, index) => (
                  <div key={server.endpointId ?? index} className="flex min-h-14 items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        <EndpointName name={server.name!} />
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{[server.countryCode, server.protocol].filter(Boolean).join(" · ")}</p>
                    </div>
                    <span className="shrink-0 font-medium tabular-nums">{countFor(server)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Топ протоколов</p>
            {protocols.length === 0 ? (
              <p className="text-sm text-muted-foreground">Данных нет.</p>
            ) : (
              <div className="space-y-2">
                {protocols.map((protocol) => (
                  <div key={protocol.protocol} className="flex min-h-14 items-center justify-between gap-2 rounded-lg border p-2.5 text-sm">
                    <span className="font-medium">{protocol.protocol}</span>
                    <span className="shrink-0 font-medium tabular-nums">{countFor(protocol)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
