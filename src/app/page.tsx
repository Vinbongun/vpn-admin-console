"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { data: staff } = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  return <AppShell><PageHeader title="Обзор платформы" description="Admin Console использует контракты vpn-platform-backend" /><div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Текущая staff-сессия</CardTitle><CardDescription>`GET /admin/v1/auth/me`</CardDescription></CardHeader><CardContent><p className="font-medium">{staff?.displayName ?? "Загрузка…"}</p><p className="text-sm text-muted-foreground">{staff?.email}</p><div className="mt-3 flex flex-wrap gap-2">{staff?.roles.map((role) => <Badge key={role}>{role}</Badge>)}</div><div className="mt-3 flex flex-wrap gap-2">{staff?.permissions.map((permission) => <Badge key={permission}>{permission}</Badge>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Подключённый контракт</CardTitle><CardDescription>OpenAPI 0.5.0</CardDescription></CardHeader><CardContent className="space-y-2 text-sm"><p>Staff и customer authentication</p><p>Customers и brand memberships</p><p>Plans и управление подписками</p><p>Audit events</p><p className="pt-2 text-muted-foreground">Инфраструктура и финансы ожидают backend-контракты.</p></CardContent></Card></div></AppShell>;
}
