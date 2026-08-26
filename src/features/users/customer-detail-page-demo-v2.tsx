"use client";

import { ChevronDownIcon, ExternalLinkIcon, InfoIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CopyButton } from "@/components/copy-button";
import { ToolbarSearch } from "@/components/page-toolbar";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SubscriptionTokenHistory } from "@/features/users/subscription-token-history";

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
  { id: "p1", title: "5 устройств · Демон VPN", category: "Продление", date: "Сегодня, 09:12", amount: 799, currency: "RUB", kind: "RENEWAL" },
  { id: "p2", title: "10 устройств · Ангел VPN", category: "Новая подписка", date: "Вчера", amount: 1490, currency: "RUB", kind: "NEW" },
  { id: "p3", title: "Whitelist-доступ · Ангел VPN", category: "Новая подписка", date: "20 авг", amount: 590, currency: "RUB", kind: "NEW" },
  { id: "p4", title: "5 устройств · Демон VPN", category: "Возврат", date: "18 авг", amount: -799, currency: "RUB", kind: "REFUND" },
  { id: "p5", title: "3 устройства · Falcon VPN", category: "Продление", date: "10 авг", amount: 599, currency: "RUB", kind: "RENEWAL" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
        <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
          {subscription.serviceLine}
        </Badge>
        <StatusBadge status={subscription.status} className="shrink-0" />
        <ChevronDownIcon className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>
            ID подписки: <span className="font-mono">{subscription.id}</span>
          </span>
          <CopyButton value={subscription.id} />
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>
              Используется как идентификатор клиента в VPN-панели (3x-ui/Remnawave) — ищите по этому значению, если нужно найти клиента напрямую в панели.
            </TooltipContent>
          </Tooltip>
        </div>
        {subscription.status === "REVOKED" && (
          <p className="mt-1 text-xs text-muted-foreground">Причина отзыва: {subscription.revokedReason || "не указана"}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
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
        {subscription.status !== "REVOKED" && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline">
              Отключить подписку
            </Button>
            <Button size="sm" variant="outline">
              Продлить
            </Button>
          </div>
        )}
        <div className="mt-3">
          <SubscriptionTokenHistory tokens={subscription.tokens} compact />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CustomerDetailPageDemoV2() {
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
  const deviceSubscriptions = subscriptions.filter((subscription) => subscription.status !== "REVOKED" && subscription.deviceLimit > 0);
  const totalConnected = deviceSubscriptions.reduce((sum, s) => sum + s.activeDeviceCount, 0);
  const totalDeviceLimit = deviceSubscriptions.reduce((sum, s) => sum + s.deviceLimit, 0);

  return (
    <AppShell>
      <Alert className="border-amber-500/50">
        <InfoIcon />
        <AlertTitle>Демо вёрстки, вариант 2 — не финальная страница</AlertTitle>
        <AlertDescription>
          Правки по замечаниям: колонка с устройствами и членствами справа, поиск и фильтр по бренду в один ряд, без иконок у подписок, отдельные колонки для линейки/статуса, карточки брендов и блок выручки переоформлены. Данные захардкожены, кнопки не работают.
        </AlertDescription>
      </Alert>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
          <div className="flex items-center gap-3">
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
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline">
              Заблокировать везде
            </Button>
            <Button size="sm" variant="outline">
              Разблокировать везде
            </Button>
            <Button size="sm">Создать подписку</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card className="rounded-2xl">
                <CardContent className="flex flex-col gap-4">
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
                    <div className="flex items-center justify-between font-medium">
                      <span>Брендов</span>
                      <span className="tabular-nums">{memberships.length}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">Учитывает оплаты по всем брендам клиента, без ручных корректировок и возвратов.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>История платежей</CardTitle>
                    <CardDescription>По всем брендам</CardDescription>
                  </div>
                  <Button size="sm" variant="outline">
                    Все
                  </Button>
                </CardHeader>
                <CardContent className="divide-y">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{payment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.category} · {payment.date}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-medium tabular-nums ${payment.amount > 0 ? "text-emerald-500" : ""}`}>
                        {payment.amount > 0 ? "+" : ""}
                        {payment.amount.toLocaleString("ru-RU")} {payment.currency}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-col gap-3">
                <div>
                  <CardTitle>Бренды и подписки</CardTitle>
                  <CardDescription>Поиск и фильтр по бренду — масштабируется на любое число брендов без потери в ширине</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ToolbarSearch value={search} onChange={setSearch} placeholder="Поиск по тарифу или ID" className="w-auto max-w-80 flex-1" />
                  <ToggleGroup variant="outline" spacing={0} value={[brandFilter]} onValueChange={(values) => setBrandFilter(values[0] ?? "all")}>
                    <ToggleGroupItem value="all">Все</ToggleGroupItem>
                    {memberships.map((membership) => (
                      <ToggleGroupItem key={membership.brandCode} value={membership.brandCode}>
                        {membership.brandCode}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
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
          </div>

          <div className="flex flex-col gap-6">
            <Card className="rounded-2xl">
              <CardContent className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Устройства подключено</p>
                  <p className="text-4xl font-semibold tracking-tight tabular-nums">
                    {totalConnected} <span className="text-lg font-normal text-muted-foreground">из {totalDeviceLimit}</span>
                  </p>
                </div>
                <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm">
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

            <div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">Членства в брендах</p>
              <div className="flex flex-col gap-3">
                {memberships.map((membership) => (
                  <div key={membership.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Avatar size="sm">
                        <AvatarFallback>{initials(membership.brandName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium">{membership.brandName}</p>
                          {membership.portalUrl && (
                            <Tooltip>
                              <TooltipTrigger
                                render={<a href={membership.portalUrl} target="_blank" rel="noreferrer" />}
                                className="inline-flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <ExternalLinkIcon className="size-3" />
                              </TooltipTrigger>
                              <TooltipContent>Открыть ЛК бренда</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {membership.brandCode} · рег. {new Date(membership.createdAt).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{membership.active ? "Активно" : "Приостановлено"}</span>
                      <Switch checked={membership.active} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
