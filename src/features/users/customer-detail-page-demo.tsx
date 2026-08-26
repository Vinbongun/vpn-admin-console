"use client";

import { ExternalLinkIcon, InfoIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  planName: string;
  status: "ACTIVE" | "REVOKED" | "SUSPENDED";
  startsAt: string;
  expiresAt: string;
  revokedReason: string | null;
  serviceLine: "MAIN" | "WHITELIST";
  endpointGroups: { id: string; name: string }[];
  tokens: MockToken[];
};

type MockMembership = {
  id: string;
  brandName: string;
  brandCode: string;
  createdAt: string;
  portalUrl: string | null;
  active: boolean;
  subscriptions: MockSubscription[];
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

const mockMemberships: MockMembership[] = [
  {
    id: "m1",
    brandName: "Демон VPN",
    brandCode: "demo",
    createdAt: "2026-08-25T00:00:00Z",
    portalUrl: "https://demo.example.com",
    active: true,
    subscriptions: [
      {
        id: "a8c5e428-8c43-46b5-9f27-32ba47e90c9a",
        planName: "5 устройств",
        status: "ACTIVE",
        startsAt: "2026-08-25T00:00:00Z",
        expiresAt: "2026-10-31T00:00:00Z",
        revokedReason: null,
        serviceLine: "MAIN",
        endpointGroups: [{ id: "eg1", name: "22" }],
        tokens: [mockToken("t1", "sub_WCcaKvm")],
      },
      {
        id: "f75a39d1-bf1b-457f-b213-f08037167f43",
        planName: "E2E Test Plan",
        status: "REVOKED",
        startsAt: "2026-08-25T00:00:00Z",
        expiresAt: "2026-08-25T00:00:00Z",
        revokedReason: "Вот так хочу",
        serviceLine: "MAIN",
        endpointGroups: [{ id: "eg2", name: "E2E Test Group" }],
        tokens: [],
      },
      {
        id: "b4c8f7b9-0b42-4b87-8683-fa0438151144",
        planName: "E2E Test Plan",
        status: "REVOKED",
        startsAt: "2026-08-25T00:00:00Z",
        expiresAt: "2026-10-24T00:00:00Z",
        revokedReason: "Так хочу",
        serviceLine: "MAIN",
        endpointGroups: [{ id: "eg3", name: "E2E Test Group" }],
        tokens: [mockToken("t2", "sub_nbM9JfEp")],
      },
      {
        id: "a0e58413-11b1-4fca-af02-cff8171892bc",
        planName: "E2E Test Plan",
        status: "REVOKED",
        startsAt: "2026-08-25T00:00:00Z",
        expiresAt: "2026-09-24T00:00:00Z",
        revokedReason: null,
        serviceLine: "MAIN",
        endpointGroups: [{ id: "eg4", name: "E2E Test Group" }],
        tokens: [mockToken("t3", "sub_Jj0ZvtB9")],
      },
    ],
  },
  {
    id: "m2",
    brandName: "Ангел VPN",
    brandCode: "demo2",
    createdAt: "2026-08-26T00:00:00Z",
    portalUrl: "https://demo2.example.com",
    active: true,
    subscriptions: [
      {
        id: "c1d2e3f4-5678-49ab-9cde-0123456789ab",
        planName: "10 устройств",
        status: "ACTIVE",
        startsAt: "2026-08-26T00:00:00Z",
        expiresAt: "2026-11-26T00:00:00Z",
        revokedReason: null,
        serviceLine: "MAIN",
        endpointGroups: [{ id: "eg5", name: "Основной пул" }],
        tokens: [mockToken("t4", "sub_qWeRtY12")],
      },
      {
        id: "d2e3f4a5-6789-4abc-9def-123456789abc",
        planName: "Whitelist-доступ",
        status: "ACTIVE",
        startsAt: "2026-08-20T00:00:00Z",
        expiresAt: "2026-09-20T00:00:00Z",
        revokedReason: null,
        serviceLine: "WHITELIST",
        endpointGroups: [{ id: "eg6", name: "Whitelist-пул" }],
        tokens: [mockToken("t5", "sub_ZxCvBn34")],
      },
    ],
  },
  {
    id: "m3",
    brandName: "Tiger VPN",
    brandCode: "demo3",
    createdAt: "2026-08-24T00:00:00Z",
    portalUrl: null,
    active: false,
    subscriptions: [
      {
        id: "e3f4a5b6-789a-4bcd-9ef0-23456789abcd",
        planName: "1 устройство",
        status: "SUSPENDED",
        startsAt: "2026-07-01T00:00:00Z",
        expiresAt: "2026-08-01T00:00:00Z",
        revokedReason: null,
        serviceLine: "MAIN",
        endpointGroups: [],
        tokens: [],
      },
    ],
  },
  {
    id: "m4",
    brandName: "Falcon VPN",
    brandCode: "demo4",
    createdAt: "2026-08-10T00:00:00Z",
    portalUrl: "https://demo4.example.com",
    active: true,
    subscriptions: [
      {
        id: "f4a5b6c7-89ab-4cde-9f01-3456789abcde",
        planName: "3 устройства",
        status: "ACTIVE",
        startsAt: "2026-08-10T00:00:00Z",
        expiresAt: "2026-12-10T00:00:00Z",
        revokedReason: null,
        serviceLine: "MAIN",
        endpointGroups: [{ id: "eg7", name: "EU-пул" }],
        tokens: [mockToken("t6", "sub_Falcon01")],
      },
    ],
  },
];

const serviceLineOrder = ["MAIN", "WHITELIST"] as const;

function groupByServiceLine(subscriptions: MockSubscription[]) {
  const groups = new Map<string, MockSubscription[]>();
  for (const subscription of subscriptions) {
    groups.set(subscription.serviceLine, [...(groups.get(subscription.serviceLine) ?? []), subscription]);
  }
  return serviceLineOrder.filter((line) => groups.has(line)).map((line) => ({ line, items: groups.get(line)! }));
}

function SubscriptionCard({ subscription }: { subscription: MockSubscription }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium">{subscription.planName}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(subscription.startsAt).toLocaleDateString()} – {new Date(subscription.expiresAt).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={subscription.status} />
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
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
        <SubscriptionTokenHistory tokens={subscription.tokens} />
      </div>
    </div>
  );
}

function BrandBlock({ membership }: { membership: MockMembership }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium">{membership.brandName}</p>
          <p className="text-xs text-muted-foreground">{membership.brandCode}</p>
          <p className="text-xs text-muted-foreground">Регистрация: {new Date(membership.createdAt).toLocaleDateString()}</p>
          {membership.portalUrl && (
            <a href={membership.portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <ExternalLinkIcon className="size-3" />
              Открыть ЛК бренда
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{membership.active ? "Активно" : "Приостановлено"}</span>
          <Switch checked={membership.active} />
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {groupByServiceLine(membership.subscriptions).map((group) => (
          <div key={group.line}>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Линейка: {group.line}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.items.map((subscription) => (
                <SubscriptionCard key={subscription.id} subscription={subscription} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerDetailPageDemo() {
  return (
    <AppShell>
      <Alert className="border-amber-500/50">
        <InfoIcon />
        <AlertTitle>Демо вёрстки — не финальная страница</AlertTitle>
        <AlertDescription>
          Карточка клиента как отдельная страница вместо popup, с данными «наживую». Всё на этой странице захардкожено (4 бренда для наглядности — как это будет выглядеть при росте числа брендов), кнопки не работают, ничего не сохраняется и не запрашивается с бэкенда.
        </AlertDescription>
      </Alert>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <PageHeader
          title="deda@yandex.ru"
          description="095c7448-9ad5-426f-b998-b9e02fb75ad9"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="ACTIVE" />
              <Button size="sm" variant="outline">
                Заблокировать везде
              </Button>
              <Button size="sm" variant="outline">
                Разблокировать везде
              </Button>
              <Button size="sm">Создать подписку</Button>
            </div>
          }
        />

        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">Бренды и подписки</p>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {mockMemberships.map((membership) => (
              <BrandBlock key={membership.id} membership={membership} />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
