import { Activity, CircleDollarSign, Server, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const metrics = [
  { label: "Пользователи", value: "12 480", note: "+4,8% за месяц", icon: Users },
  { label: "Активные подписки", value: "9 216", note: "73,8% клиентской базы", icon: Activity },
  { label: "Healthy endpoints", value: "28 / 30", note: "2 требуют внимания", icon: Server },
  { label: "MRR", value: "₽ 3,24 млн", note: "Демонстрационные данные", icon: CircleDollarSign },
];

export default function DashboardPage() {
  return <AppShell><PageHeader title="Обзор платформы" description="Операционная сводка по всем VPN-брендам" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, note, icon: Icon }) => <Card key={label}><CardHeader className="flex-row items-center justify-between pb-2"><CardDescription>{label}</CardDescription><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent><CardTitle className="text-2xl">{value}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{note}</p></CardContent></Card>)}</div><div className="mt-6 grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><CardTitle>Состояние платформы</CardTitle><CardDescription>Mocks до подключения admin API</CardDescription></CardHeader><CardContent className="space-y-3">{["Product Backend", "Subscription Gateway", "Remnawave adapter", "3x-ui adapter"].map((name, index) => <div key={name} className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm font-medium">{name}</span><Badge className={index < 2 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}>{index < 2 ? "Operational" : "Mock"}</Badge></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Доступ</CardTitle><CardDescription>Текущая mock-сессия</CardDescription></CardHeader><CardContent><p className="font-medium">SUPER_ADMIN</p><p className="mt-2 text-sm text-muted-foreground">5 разрешений активно. Финальная авторизация всегда выполняется backend.</p></CardContent></Card></div></AppShell>;
}
