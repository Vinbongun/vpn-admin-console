"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, CircleAlert, CreditCardIcon, Network, RadioTower, TagIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { AdminPopularityQuery } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { EndpointName } from "@/components/endpoint-name";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

const quickLinks = [
  { label: "Панели и серверы", description: "Панели управления и физические VPS", href: "/infrastructure/panels-and-servers", icon: RadioTower },
  { label: "Точки подключения", description: "То, что клиент видит как «сервер» в приложении", href: "/infrastructure/protocols", icon: Network },
  { label: "Инциденты", description: "История проблем с точками подключения/серверами", href: "/infrastructure/incidents", icon: CircleAlert },
  { label: "Регистраторы VPS", description: "Покупка и управление серверами", href: "/infrastructure/vps-registrars", icon: CreditCardIcon },
  { label: "Домены", description: "Купленные домены и цены по зонам", href: "/infrastructure/domains", icon: TagIcon },
];

export function InfrastructureOverviewPage() {
  const summary = useQuery({ queryKey: ["admin-infrastructure-summary"], queryFn: adminApi.getInfrastructureSummary, retry: false });
  const counters = [
    { label: "Панели", value: summary.data?.sources, icon: RadioTower },
    { label: "Точки подключения", value: summary.data?.endpoints, icon: Network },
    { label: "Исправны", value: summary.data?.healthy, icon: Activity },
    { label: "Неисправны", value: summary.data?.unhealthy, icon: CircleAlert },
    { label: "Открытые инциденты", value: summary.data?.openIncidents, icon: CircleAlert },
  ];

  const [mode, setMode] = useState<"assigned" | "live">("assigned");
  const [days, setDays] = useState("7");
  const popularity = useQuery({
    queryKey: ["admin-dashboard-popularity", mode, days],
    queryFn: () => adminApi.getDashboardPopularity({ mode, ...(mode === "live" ? { days: Number(days) } : {}) } satisfies AdminPopularityQuery),
    retry: false,
  });
  const popularServers = (popularity.data?.servers ?? []).filter((server) => server.name);
  const popularProtocols = popularity.data?.protocols ?? [];
  const countFor = (item: { subscriptionCount?: number; sampleCount?: number }) => (mode === "assigned" ? (item.subscriptionCount ?? 0) : (item.sampleCount ?? 0));

  return (
    <AppShell>
      <PageHeader title="Инфраструктура" description="Сводка по панелям, серверам и инцидентам — подробности на отдельных страницах ниже" />

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
        {counters.map(({ label, value, icon: Icon }) => (
          <StatCard key={label} label={label} icon={Icon} value={summary.isLoading ? "…" : summary.isError ? "—" : (value ?? 0)} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @3xl/main:grid-cols-3">
        {quickLinks.map(({ label, description, href, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="gap-1 p-4 transition-colors hover:bg-accent">
              <Icon className="mb-1 size-5 text-muted-foreground" />
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </Card>
          </Link>
        ))}
      </div>

      <SectionHeader
        title="Статистика"
        description={
          mode === "assigned"
            ? "На скольких активных подписках сейчас реально назначена точка подключения — точное число, без задержки."
            : `Сколько раз за последние ${days} дней точку подключения видели активной по данным фонового опроса — относительный рейтинг, не точное число уникальных пользователей.`
        }
        actions={
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
        }
      />

      {popularity.isLoading ? (
        <LoadingState />
      ) : popularity.isError ? (
        <ErrorState description="Не удалось получить статистику популярности." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Топ точек подключения</p>
            {popularServers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Данных нет.</p>
            ) : (
              <div className="space-y-2">
                {popularServers.map((server, index) => (
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
            {popularProtocols.length === 0 ? (
              <p className="text-sm text-muted-foreground">Данных нет.</p>
            ) : (
              <div className="space-y-2">
                {popularProtocols.map((protocol) => (
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
