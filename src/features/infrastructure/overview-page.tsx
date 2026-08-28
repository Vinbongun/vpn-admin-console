"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, CircleAlert, CreditCardIcon, Network, RadioTower, Server, TagIcon } from "lucide-react";
import Link from "next/link";
import { adminApi } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const quickLinks = [
  { label: "Панели и серверы", description: "Панели управления и физические VPS", href: "/infrastructure/panels-and-servers", icon: RadioTower },
  { label: "Протоколы", description: "Inbound'ы по всем панелям, здоровье и фильтры", href: "/infrastructure/protocols", icon: Network },
  { label: "Инциденты", description: "История проблем с протоколами/серверами", href: "/infrastructure/incidents", icon: CircleAlert },
  { label: "Статистика", description: "Популярность серверов и протоколов", href: "/infrastructure/stats", icon: Activity },
  { label: "Регистраторы VPS", description: "Аккаунты QWINS, каталог тарифов, покупка серверов", href: "/infrastructure/vps-registrars", icon: CreditCardIcon },
  { label: "Домены", description: "Купленные домены и цены по зонам", href: "/infrastructure/domains", icon: TagIcon },
];

export function InfrastructureOverviewPage() {
  const summary = useQuery({ queryKey: ["admin-infrastructure-summary"], queryFn: adminApi.getInfrastructureSummary, retry: false });
  const counters = [
    { label: "Панели", value: summary.data?.sources, icon: RadioTower },
    { label: "Серверы", value: summary.data?.endpoints, icon: Server },
    { label: "Исправны", value: summary.data?.healthy, icon: Activity },
    { label: "Неисправны", value: summary.data?.unhealthy, icon: CircleAlert },
    { label: "Открытые инциденты", value: summary.data?.openIncidents, icon: CircleAlert },
  ];

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
    </AppShell>
  );
}
