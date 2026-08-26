"use client";

import {
  ChevronDownIcon,
  ClockIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  GaugeIcon,
  HashIcon,
  InfoIcon,
  LinkIcon,
  MailIcon,
  RefreshCcwIcon,
  SendIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { CopyButton } from "@/components/copy-button";
import { ToolbarSearch } from "@/components/page-toolbar";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type MockToken = {
  id: string;
  tokenPrefix: string;
  status: "ACTIVE" | "REVOKED";
  subscriptionUrl: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
};

type MockSubscription = {
  id: string;
  brandCode: string;
  brandName: string;
  planName: string;
  status: "ACTIVE" | "REVOKED" | "SUSPENDED";
  serviceLine: "MAIN" | "WHITELIST";
  startsAt: string;
  expiresAt: string;
  revokedReason: string | null;
  endpointGroups: { id: string; name: string }[];
  tokens: MockToken[];
  activeDeviceCount: number;
  deviceLimit: number;
};

type MockMembership = {
  id: string;
  brandName: string;
  brandCode: string;
  createdAt: string;
  portalUrl: string | null;
  active: boolean;
};

type MockPayment = {
  id: string;
  title: string;
  category: string;
  date: string;
  amount: number;
  currency: string;
  kind: "NEW" | "RENEWAL" | "REFUND";
  serviceLine: "MAIN" | "WHITELIST";
};

const mockToken = (id: string, prefix: string): MockToken => ({
  id,
  tokenPrefix: prefix,
  status: "ACTIVE",
  subscriptionUrl: `http://localhost:3000/s/${prefix}0a1b2c3d`,
  createdAt: "2026-08-26T09:27:14Z",
  lastUsedAt: "2026-08-26T09:47:05Z",
  revokedAt: null,
  expiresAt: null,
});

const memberships: MockMembership[] = [
  { id: "m1", brandName: "Демон VPN", brandCode: "demo", createdAt: "2026-08-25T00:00:00Z", portalUrl: "https://demo.example.com", active: true },
  { id: "m2", brandName: "Ангел VPN", brandCode: "demo2", createdAt: "2026-08-26T00:00:00Z", portalUrl: "https://demo2.example.com", active: true },
  { id: "m3", brandName: "Tiger VPN", brandCode: "demo3", createdAt: "2026-08-24T00:00:00Z", portalUrl: null, active: false },
  { id: "m4", brandName: "Falcon VPN", brandCode: "demo4", createdAt: "2026-08-10T00:00:00Z", portalUrl: "https://demo4.example.com", active: true },
];

const subscriptions: MockSubscription[] = [
  {
    id: "a8c5e428-8c43-46b5-9f27-32ba47e90c9a",
    brandCode: "demo",
    brandName: "Демон VPN",
    planName: "5 устройств",
    status: "ACTIVE",
    serviceLine: "MAIN",
    startsAt: "2026-08-25T00:00:00Z",
    expiresAt: "2026-10-31T00:00:00Z",
    revokedReason: null,
    endpointGroups: [{ id: "eg1", name: "22" }],
    tokens: [mockToken("t1", "sub_WCcaKvm")],
    activeDeviceCount: 3,
    deviceLimit: 5,
  },
  {
    id: "f75a39d1-bf1b-457f-b213-f08037167f43",
    brandCode: "demo",
    brandName: "Демон VPN",
    planName: "E2E Test Plan",
    status: "REVOKED",
    serviceLine: "MAIN",
    startsAt: "2026-08-25T00:00:00Z",
    expiresAt: "2026-08-25T00:00:00Z",
    revokedReason: "Вот так хочу",
    endpointGroups: [{ id: "eg2", name: "E2E Test Group" }],
    tokens: [],
    activeDeviceCount: 0,
    deviceLimit: 0,
  },
  {
    id: "b4c8f7b9-0b42-4b87-8683-fa0438151144",
    brandCode: "demo",
    brandName: "Демон VPN",
    planName: "E2E Test Plan",
    status: "REVOKED",
    serviceLine: "MAIN",
    startsAt: "2026-08-25T00:00:00Z",
    expiresAt: "2026-10-24T00:00:00Z",
    revokedReason: "Так хочу",
    endpointGroups: [{ id: "eg3", name: "E2E Test Group" }],
    tokens: [mockToken("t2", "sub_nbM9JfEp")],
    activeDeviceCount: 0,
    deviceLimit: 0,
  },
  {
    id: "c1d2e3f4-5678-49ab-9cde-0123456789ab",
    brandCode: "demo2",
    brandName: "Ангел VPN",
    planName: "10 устройств",
    status: "ACTIVE",
    serviceLine: "MAIN",
    startsAt: "2026-08-26T00:00:00Z",
    expiresAt: "2026-11-26T00:00:00Z",
    revokedReason: null,
    endpointGroups: [{ id: "eg5", name: "Основной пул" }],
    tokens: [mockToken("t4", "sub_qWeRtY12")],
    activeDeviceCount: 4,
    deviceLimit: 10,
  },
  {
    id: "d2e3f4a5-6789-4abc-9def-123456789abc",
    brandCode: "demo2",
    brandName: "Ангел VPN",
    planName: "Whitelist-доступ",
    status: "ACTIVE",
    serviceLine: "WHITELIST",
    startsAt: "2026-08-20T00:00:00Z",
    expiresAt: "2026-09-20T00:00:00Z",
    revokedReason: null,
    endpointGroups: [{ id: "eg6", name: "Whitelist-пул" }],
    tokens: [mockToken("t5", "sub_ZxCvBn34")],
    activeDeviceCount: 1,
    deviceLimit: 2,
  },
  {
    id: "e3f4a5b6-789a-4bcd-9ef0-23456789abcd",
    brandCode: "demo3",
    brandName: "Tiger VPN",
    planName: "1 устройство",
    status: "SUSPENDED",
    serviceLine: "MAIN",
    startsAt: "2026-07-01T00:00:00Z",
    expiresAt: "2026-08-01T00:00:00Z",
    revokedReason: null,
    endpointGroups: [],
    tokens: [],
    activeDeviceCount: 0,
    deviceLimit: 1,
  },
  {
    id: "f4a5b6c7-89ab-4cde-9f01-3456789abcde",
    brandCode: "demo4",
    brandName: "Falcon VPN",
    planName: "3 устройства",
    status: "ACTIVE",
    serviceLine: "MAIN",
    startsAt: "2026-08-10T00:00:00Z",
    expiresAt: "2026-12-10T00:00:00Z",
    revokedReason: null,
    endpointGroups: [{ id: "eg7", name: "EU-пул" }],
    tokens: [mockToken("t6", "sub_Falcon01")],
    activeDeviceCount: 2,
    deviceLimit: 3,
  },
];

const payments: MockPayment[] = [
  { id: "p1", title: "5 устройств · Демон VPN", category: "Продление", date: "Сегодня, 09:12", amount: 799, currency: "RUB", kind: "RENEWAL", serviceLine: "MAIN" },
  { id: "p2", title: "10 устройств · Ангел VPN", category: "Новая подписка", date: "Вчера", amount: 1490, currency: "RUB", kind: "NEW", serviceLine: "MAIN" },
  { id: "p3", title: "Whitelist-доступ · Ангел VPN", category: "Новая подписка", date: "20 авг", amount: 590, currency: "RUB", kind: "NEW", serviceLine: "WHITELIST" },
  { id: "p4", title: "5 устройств · Демон VPN", category: "Возврат", date: "18 авг", amount: -799, currency: "RUB", kind: "REFUND", serviceLine: "MAIN" },
  { id: "p5", title: "3 устройства · Falcon VPN", category: "Продление", date: "10 авг", amount: 599, currency: "RUB", kind: "RENEWAL", serviceLine: "MAIN" },
];

const paymentIcon = { NEW: ShoppingCartIcon, RENEWAL: RefreshCcwIcon, REFUND: CreditCardIcon } as const;

const trafficData = [
  { day: "Пн", incoming: 4.2, outgoing: 1.1 },
  { day: "Вт", incoming: 5.8, outgoing: 1.6 },
  { day: "Ср", incoming: 3.9, outgoing: 0.9 },
  { day: "Чт", incoming: 6.4, outgoing: 2.1 },
  { day: "Пт", incoming: 7.1, outgoing: 2.4 },
  { day: "Сб", incoming: 8.6, outgoing: 3.0 },
  { day: "Вс", incoming: 6.9, outgoing: 2.2 },
];

const trafficChartConfig = {
  incoming: { label: "Входящий, GiB", color: "var(--chart-1)" },
  outgoing: { label: "Исходящий, GiB", color: "var(--chart-2)" },
} satisfies ChartConfig;

function ActionButtons({ subscription }: { subscription: MockSubscription }) {
  if (subscription.status === "REVOKED") return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline">
        Отключить подписку
      </Button>
      <Button size="sm" variant="outline">
        Продлить
      </Button>
    </div>
  );
}

function SubscriptionAccordion({ subscription }: { subscription: MockSubscription }) {
  const activeToken = subscription.tokens.find((token) => token.status === "ACTIVE");
  return (
    <div className="flex flex-col gap-3 pb-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
          <div className="space-y-1.5">
            <Label>ID подписки</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <HashIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input readOnly value={subscription.id} className="pl-8 font-mono text-xs" />
              </div>
              <CopyButton value={subscription.id} />
            </div>
          </div>
          {subscription.status === "REVOKED" && (
            <p className="text-xs text-muted-foreground">Причина отзыва: {subscription.revokedReason || "не указана"}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {subscription.endpointGroups.length === 0 ? (
              <span className="text-xs text-muted-foreground">Групп доступа нет</span>
            ) : (
              subscription.endpointGroups.map((group) => (
                <span key={group.id} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  {group.name}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
          {activeToken?.subscriptionUrl ? (
            <>
              <div className="space-y-1.5">
                <Label>Ссылка на подписку</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input readOnly value={activeToken.subscriptionUrl} className="pl-8 font-mono text-xs" />
                  </div>
                  <CopyButton value={activeToken.subscriptionUrl} />
                </div>
              </div>
              <span className="w-fit rounded-full border px-2 py-0.5 text-xs text-muted-foreground">выдан {new Date(activeToken.createdAt).toLocaleDateString("ru-RU")}</span>
            </>
          ) : (
            <>
              <p className="text-xs font-medium">Ссылка на подписку</p>
              <p className="text-xs text-muted-foreground">Ссылок пока не выдано.</p>
            </>
          )}
        </div>
      </div>
      <ActionButtons subscription={subscription} />
    </div>
  );
}

function SubscriptionRow({ subscription }: { subscription: MockSubscription }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-3 py-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{subscription.planName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {subscription.brandName} · {new Date(subscription.startsAt).toLocaleDateString("ru-RU")} – {new Date(subscription.expiresAt).toLocaleDateString("ru-RU")}
          </p>
        </div>
        <div className="hidden w-20 shrink-0 justify-center sm:flex">
          <Badge variant="outline">{subscription.serviceLine}</Badge>
        </div>
        <div className="flex w-24 shrink-0 justify-center">
          <StatusBadge status={subscription.status} />
        </div>
        <ChevronDownIcon className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SubscriptionAccordion subscription={subscription} />
      </CollapsibleContent>
    </Collapsible>
  );
}

function MembershipRow({ membership }: { membership: MockMembership }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate font-medium">{membership.brandName}</p>
          {membership.portalUrl && (
            <Tooltip>
              <TooltipTrigger
                render={<a href={membership.portalUrl} target="_blank" rel="noreferrer" />}
                className="-translate-y-1 text-muted-foreground hover:text-foreground"
              >
                <ExternalLinkIcon className="size-2.5" />
              </TooltipTrigger>
              <TooltipContent>Открыть ЛК бренда</TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {membership.brandCode} · рег. {new Date(membership.createdAt).toLocaleDateString("ru-RU")}
        </p>
      </div>
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{membership.active ? "Активно" : "Приостановлено"}</span>
      <Switch checked={membership.active} className="shrink-0" />
    </div>
  );
}

export function CustomerDetailPageDemoV5() {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");

  const filtered = useMemo(
    () =>
      subscriptions.filter((subscription) => {
        if (brandFilter !== "all" && subscription.brandCode !== brandFilter) return false;
        if (!search) return true;
        const haystack = `${subscription.planName} ${subscription.id}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [search, brandFilter],
  );

  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const revenueByLine = (line: "MAIN" | "WHITELIST") => payments.filter((p) => p.serviceLine === line).reduce((sum, p) => sum + p.amount, 0);
  const deviceSubscriptions = subscriptions.filter((subscription) => subscription.status !== "REVOKED" && subscription.deviceLimit > 0);
  const totalConnected = deviceSubscriptions.reduce((sum, s) => sum + s.activeDeviceCount, 0);
  const totalDeviceLimit = deviceSubscriptions.reduce((sum, s) => sum + s.deviceLimit, 0);

  return (
    <AppShell>
      <Alert className="border-amber-500/50">
        <InfoIcon />
        <AlertTitle>Демо вёрстки, вариант 5 — не финальная страница</AlertTitle>
        <AlertDescription>
          Копия варианта 4 + «Контактная информация» рядом с «Устройства подключено», и ниже новый блок «Статистика использования» (график на recharts +
          shadcn chart.tsx) рядом с «Трафик и лимиты». Данные захардкожены, кнопки не работают.
        </AlertDescription>
      </Alert>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
          <Avatar size="lg">
            <AvatarFallback>DY</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-lg font-semibold tracking-tight">deda@yandex.ru</h1>
              <StatusBadge status="ACTIVE" />
            </div>
            <p className="text-sm text-muted-foreground">095c7448-9ad5-426f-b998-b9e02fb75ad9 · клиент с 25.08.2026</p>
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
          <Card className="flex h-full flex-col rounded-2xl">
            <CardContent className="flex flex-1 flex-col gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Всего принёс денег</p>
                <p className="text-4xl font-semibold tracking-tight tabular-nums">{totalRevenue.toLocaleString("ru-RU")} ₽</p>
              </div>
              <Badge variant="outline" className="w-fit gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Платящий клиент
              </Badge>
              <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Платежей всего</span>
                  <span className="tabular-nums">{payments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Активных подписок</span>
                  <span className="tabular-nums">{subscriptions.filter((s) => s.status === "ACTIVE").length}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Доход · MAIN</span>
                  <span className="tabular-nums">{revenueByLine("MAIN").toLocaleString("ru-RU")} ₽</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Доход · WHITELIST</span>
                  <span className="tabular-nums">{revenueByLine("WHITELIST").toLocaleString("ru-RU")} ₽</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between font-medium">
                  <span>Брендов</span>
                  <span className="tabular-nums">{memberships.length}</span>
                </div>
              </div>
              <p className="mt-auto text-xs text-muted-foreground italic">Учитывает оплаты по всем брендам клиента, без ручных корректировок и возвратов.</p>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Членства в брендах</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 divide-y">
              {memberships.map((membership) => (
                <MembershipRow key={membership.id} membership={membership} />
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>Бренды и подписки</CardTitle>
                  <CardDescription>Поиск и фильтр по бренду — масштабируется на любое число брендов без потери в ширине</CardDescription>
                </div>
                <Button size="sm">Создать подписку</Button>
              </div>
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <ToolbarSearch value={search} onChange={setSearch} placeholder="Поиск по тарифу или ID" className="w-auto max-w-80" />
                <ToggleGroup variant="outline" spacing={0} value={[brandFilter]} onValueChange={(values) => setBrandFilter(values[0] ?? "all")}>
                  <ToggleGroupItem value="all">Все</ToggleGroupItem>
                  {memberships.map((membership) => (
                    <ToggleGroupItem key={membership.brandCode} value={membership.brandCode}>
                      {membership.brandCode}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Ничего не найдено.</p>
            ) : (
              filtered.map((subscription) => <SubscriptionRow key={subscription.id} subscription={subscription} />)
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Устройства подключено</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-4xl font-semibold tracking-tight tabular-nums">
                {totalConnected} <span className="text-lg font-normal text-muted-foreground">из {totalDeviceLimit}</span>
              </p>
              <div className="mt-4 flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                {deviceSubscriptions.map((subscription) => (
                  <div key={subscription.id} className="flex items-center justify-between">
                    <span className="truncate text-muted-foreground">{subscription.brandName}</span>
                    <span className="shrink-0 tabular-nums">
                      {subscription.activeDeviceCount} / {subscription.deviceLimit}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MailIcon className="size-4 text-muted-foreground" />
                Контактная информация
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="contact-telegram">Telegram ID</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <SendIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="contact-telegram" defaultValue="@dedavpn" placeholder="Telegram ID клиента (необязательно)" className="pl-8" />
                  </div>
                  <CopyButton value="@dedavpn" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <MailIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="contact-email" type="email" defaultValue="deda@yandex.ru" placeholder="Email клиента (необязательно)" className="pl-8" />
                  </div>
                  <CopyButton value="deda@yandex.ru" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Статистика использования</CardTitle>
              <CardDescription>Трафик клиента за последние 7 дней, по всем подпискам</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ChartContainer config={trafficChartConfig}>
                <AreaChart accessibilityLayer data={trafficData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Area dataKey="outgoing" type="natural" fill="var(--color-outgoing)" fillOpacity={0.4} stroke="var(--color-outgoing)" stackId="a" />
                  <Area dataKey="incoming" type="natural" fill="var(--color-incoming)" fillOpacity={0.4} stroke="var(--color-incoming)" stackId="a" />
                </AreaChart>
              </ChartContainer>
            </CardContent>
            <CardFooter>
              <div className="flex w-full items-start gap-2 text-sm">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 leading-none font-medium">
                    Трафик вырос на 12% за неделю <TrendingUpIcon className="size-4" />
                  </div>
                  <div className="flex items-center gap-2 leading-none text-muted-foreground">20 – 26 августа 2026</div>
                </div>
              </div>
            </CardFooter>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GaugeIcon className="size-4 text-muted-foreground" />
                Трафик и лимиты
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="traffic-limit">Лимит трафика</Label>
                <p className="text-xs text-muted-foreground">0 - неограниченно</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <GaugeIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="traffic-limit" type="number" min={0} defaultValue={0} className="pl-8" />
                  </div>
                  <Select items={[{ value: "GiB", label: "GiB" }, { value: "TiB", label: "TiB" }]} defaultValue="GiB">
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GiB">GiB</SelectItem>
                      <SelectItem value="TiB">TiB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="traffic-reset">Стратегия сброса трафика</Label>
                <p className="text-xs text-muted-foreground">Как часто следует сбрасывать трафик пользователя</p>
                <Select
                  items={[
                    { value: "never", label: "Никогда не сбрасывать" },
                    { value: "daily", label: "Каждый день" },
                    { value: "monthly", label: "Каждый месяц" },
                  ]}
                  defaultValue="never"
                >
                  <SelectTrigger id="traffic-reset" className="w-full">
                    <ClockIcon className="text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Никогда не сбрасывать</SelectItem>
                    <SelectItem value="daily">Каждый день</SelectItem>
                    <SelectItem value="monthly">Каждый месяц</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>История платежей</CardTitle>
            <CardDescription>Последние операции клиента по всем брендам</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {payments.map((payment) => {
              const Icon = paymentIcon[payment.kind];
              return (
                <div key={payment.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{payment.title}</p>
                    <p className="text-xs text-muted-foreground">{payment.category}</p>
                  </div>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{payment.date}</span>
                  <span className={`shrink-0 text-sm font-medium tabular-nums ${payment.amount > 0 ? "text-emerald-500" : ""}`}>
                    {payment.amount > 0 ? "+" : ""}
                    {payment.amount.toLocaleString("ru-RU")} {payment.currency}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
