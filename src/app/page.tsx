"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { data: staff } = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  return <AppShell><PageHeader title="Обзор платформы" description="Admin Console использует контракты vpn-platform-backend" /><div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Текущая staff-сессия</CardTitle><CardDescription>`GET /admin/v1/auth/me`</CardDescription></CardHeader><CardContent><p className="font-medium">{staff?.displayName ?? "Загрузка…"}</p><p className="text-sm text-muted-foreground">{staff?.email}</p><div className="mt-3 flex flex-wrap gap-2">{staff?.roles.map((role) => <Badge key={role}>{role}</Badge>)}</div><div className="mt-3 flex flex-wrap gap-2">{staff?.permissions.map((permission) => <Badge key={permission}>{permission}</Badge>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Справочники</CardTitle><CardDescription>Бренды, тарифы и группы endpoint&#39;ов</CardDescription></CardHeader><CardContent className="space-y-2 text-sm"><p>Бренды: домены, статус, публичные настройки</p><p>Тарифы: биллинг-модель, лимит устройств, цена</p><p>Группы endpoint&#39;ов: какие серверы доступны каждому тарифу</p><Link className="mt-2 inline-block text-primary underline" href="/reference">Открыть справочники →</Link></CardContent></Card></div></AppShell>;
}
