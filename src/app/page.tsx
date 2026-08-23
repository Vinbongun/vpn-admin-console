"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { adminApi } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RetentionSection } from "@/features/retention/retention-section";

export default function DashboardPage() {
  const { data: staff, isLoading } = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });

  return (
    <AppShell>
      <PageHeader title="Обзор платформы" description="Управление брендами, тарифами, подписками клиентов и инфраструктурой VPN-платформы" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Текущая staff-сессия</CardTitle>
            <CardDescription>Ваш аккаунт, роли и права доступа в этой консоли</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            ) : (
              <>
                <p className="font-medium">{staff?.displayName}</p>
                <p className="text-sm text-muted-foreground">{staff?.email}</p>
              </>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {staff?.roles.map((role) => (
                <Badge key={role}>{role}</Badge>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {staff?.permissions.map((permission) => (
                <Badge key={permission} variant="outline">
                  {permission}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Справочники</CardTitle>
            <CardDescription>Бренды, тарифы и группы endpoint&#39;ов</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Бренды: домены, статус, публичные настройки</p>
            <p>Тарифы: биллинг-модель, лимит устройств, цена</p>
            <p>Группы endpoint&#39;ов: какие серверы доступны каждому тарифу</p>
            <Button render={<Link href="/reference" />} nativeButton={false} className="mt-2 px-0" variant="link">
              Открыть справочники
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </div>
      <RetentionSection staff={staff} />
    </AppShell>
  );
}
