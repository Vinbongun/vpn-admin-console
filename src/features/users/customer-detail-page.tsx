"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ClockIcon,
  ExternalLinkIcon,
  GaugeIcon,
  GiftIcon,
  HashIcon,
  LinkIcon,
  type LucideIcon,
  MailIcon,
  RefreshCcwIcon,
  SendIcon,
  ShoppingCartIcon,
  TriangleAlertIcon,
  Undo2Icon,
  UserCogIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";
import { adminApi } from "@/api/client";
import type { CustomerHistoryEvent, CustomerSubscriptionSummary, PlanSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyButton } from "@/components/copy-button";
import { ErrorState } from "@/components/error-state";
import { ToolbarSearch } from "@/components/page-toolbar";
import { StatusBadge } from "@/components/status-badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateSubscriptionDialog } from "@/features/subscriptions/create-dialog";

const liveStatuses = new Set(["PENDING", "TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED"]);

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("ru-RU")} ${currency === "RUB" ? "₽" : currency}`;
}

// Placeholder chart while the backend has no real traffic data (see customer-detail-page.md) - deliberately
// desaturated/dimmed with a warning banner above it so support never mistakes this for a real reading.
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

const historyIconFor = (event: CustomerHistoryEvent) => {
  if (event.kind === "AUDIT") return UserCogIcon;
  if (event.action === "REFUND") return Undo2Icon;
  if (event.action === "BONUS_CREDIT" || event.action === "REFERRAL_CREDIT" || event.action === "COMPENSATION_CREDIT") return GiftIcon;
  if (event.action === "RENEWAL") return RefreshCcwIcon;
  return ShoppingCartIcon;
};

function HistoryRow({ event, icon: Icon }: { event: CustomerHistoryEvent; icon: LucideIcon }) {
  const isRefund = event.action === "REFUND";
  const isAudit = event.kind === "AUDIT";
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${isAudit ? "bg-amber-500/10" : "bg-muted"}`}>
        <Icon className={`size-4 ${isAudit ? "text-amber-500" : "text-muted-foreground"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{event.description}</p>
        <p className="text-xs text-muted-foreground">
          {isAudit ? `Причина: ${event.reason}` : (event.brandName ?? "—")} · {new Date(event.occurredAt).toLocaleString("ru-RU")}
          {event.status && ` · ${event.status}`}
        </p>
      </div>
      {event.amount != null && (
        <span className={`shrink-0 text-sm font-medium tabular-nums ${isRefund ? "text-destructive" : "text-emerald-500"}`}>
          {isRefund ? "−" : "+"}
          {formatMoney(event.amount, event.currency ?? "RUB")}
        </span>
      )}
    </div>
  );
}

function SubscriptionRow({
  subscription,
  brandName,
  serviceLine,
  revokingSubscriptionId,
  revokeReason,
  onStartRevoke,
  onCancelRevoke,
  onRevokeReasonChange,
  onConfirmRevoke,
  isRevoking,
  extendingSubscriptionId,
  extendForm,
  onStartExtend,
  onCancelExtend,
  onExtendFormChange,
  onConfirmExtend,
  isExtending,
}: {
  subscription: CustomerSubscriptionSummary;
  brandName: string;
  serviceLine: "MAIN" | "WHITELIST" | undefined;
  revokingSubscriptionId: string | undefined;
  revokeReason: string;
  onStartRevoke: (id: string) => void;
  onCancelRevoke: () => void;
  onRevokeReasonChange: (value: string) => void;
  onConfirmRevoke: (id: string) => void;
  isRevoking: boolean;
  extendingSubscriptionId: string | undefined;
  extendForm: { days: string; reason: string };
  onStartExtend: (id: string) => void;
  onCancelExtend: () => void;
  onExtendFormChange: (value: { days: string; reason: string }) => void;
  onConfirmExtend: (id: string) => void;
  isExtending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const activeToken = subscription.tokens.find((token) => token.status === "ACTIVE");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-3 py-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{subscription.planName ?? subscription.planCode ?? "Без плана"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {brandName} · {new Date(subscription.startsAt).toLocaleDateString("ru-RU")} – {new Date(subscription.expiresAt).toLocaleDateString("ru-RU")}
          </p>
        </div>
        <div className="hidden w-20 shrink-0 justify-center sm:flex">{serviceLine && <Badge variant="outline">{serviceLine}</Badge>}</div>
        <div className="flex w-24 shrink-0 justify-center">
          <StatusBadge status={subscription.status} />
        </div>
        <ChevronDownIcon className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-3 pb-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4">
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
                  subscription.endpointGroups.map((group, index) => (
                    <span key={group.id ?? index} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      {group.name ?? group.code ?? "—"}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4">
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
          {liveStatuses.has(subscription.status) && (
            <div>
              {revokingSubscriptionId === subscription.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input aria-label="Причина отключения" placeholder="Причина отключения" className="max-w-52" value={revokeReason} onChange={(event) => onRevokeReasonChange(event.target.value)} />
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="destructive" disabled={!revokeReason || isRevoking}>
                        Отключить
                      </Button>
                    }
                    title="Отключить подписку?"
                    description={`Клиент немедленно потеряет доступ ко всем группам endpoint'ов этой подписки. Причина: «${revokeReason}».`}
                    confirmLabel="Отключить"
                    isPending={isRevoking}
                    onConfirm={() => onConfirmRevoke(subscription.id)}
                  />
                  <Button size="sm" variant="outline" onClick={onCancelRevoke}>
                    Отмена
                  </Button>
                </div>
              ) : extendingSubscriptionId === subscription.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    aria-label="Дней"
                    type="number"
                    min={1}
                    placeholder="Дней"
                    className="w-20"
                    value={extendForm.days}
                    onChange={(event) => onExtendFormChange({ ...extendForm, days: event.target.value })}
                  />
                  <Input
                    aria-label="Причина продления"
                    placeholder="Причина продления"
                    className="max-w-40"
                    value={extendForm.reason}
                    onChange={(event) => onExtendFormChange({ ...extendForm, reason: event.target.value })}
                  />
                  <Button size="sm" disabled={!extendForm.days || Number(extendForm.days) <= 0 || !extendForm.reason || isExtending} onClick={() => onConfirmExtend(subscription.id)}>
                    {isExtending && <Spinner />}
                    Продлить
                  </Button>
                  <Button size="sm" variant="outline" onClick={onCancelExtend}>
                    Отмена
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onStartRevoke(subscription.id)}>
                    Отключить подписку
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onStartExtend(subscription.id)}>
                    Продлить
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [membershipToggle, setMembershipToggle] = useState<{ id: string; brandName: string; nextStatus: "ACTIVE" | "SUSPENDED" }>();
  const [revokingSubscriptionId, setRevokingSubscriptionId] = useState<string>();
  const [revokeReason, setRevokeReason] = useState("");
  const [extendingSubscriptionId, setExtendingSubscriptionId] = useState<string>();
  const [extendForm, setExtendForm] = useState({ days: "7", reason: "" });
  const [contactForm, setContactForm] = useState<{ telegramId: string; notes: string }>({ telegramId: "", notes: "" });
  const [contactTouched, setContactTouched] = useState(false);

  const detail = useQuery({ queryKey: ["admin-customer", customerId], queryFn: () => adminApi.getCustomer(customerId), retry: false });
  const history = useQuery({ queryKey: ["admin-customer-history", customerId], queryFn: () => adminApi.getCustomerHistory(customerId), retry: false });
  const allPlans = useQuery({ queryKey: ["admin-plans", "customer-detail-page-all"], queryFn: () => adminApi.listPlans({ page: 1, pageSize: 100 }), retry: false });

  const data = detail.data;
  if (data && !contactTouched) {
    const wanted = { telegramId: data.telegramId ?? "", notes: data.notes ?? "" };
    if (wanted.telegramId !== contactForm.telegramId || wanted.notes !== contactForm.notes) setContactForm(wanted);
  }

  const refreshCustomer = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-customers"] }), queryClient.invalidateQueries({ queryKey: ["admin-customer", customerId] })]);

  const membershipMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) => adminApi.updateMembership(id, { status }),
    onSuccess: refreshCustomer,
    onError: () => toast.error("Не удалось изменить статус членства."),
  });
  const revokeSubscriptionMutation = useMutation({
    mutationFn: (input: { id: string; reason: string }) => adminApi.revokeSubscription(input.id, input.reason),
    onSuccess: async () => {
      setRevokingSubscriptionId(undefined);
      setRevokeReason("");
      toast.success("Подписка отключена.");
      await refreshCustomer();
    },
    onError: () => toast.error("Не удалось отключить подписку."),
  });
  const extendSubscriptionMutation = useMutation({
    mutationFn: (input: { id: string; days: number; reason: string }) => adminApi.extendSubscription(input.id, { days: input.days, reason: input.reason }),
    onSuccess: async () => {
      setExtendingSubscriptionId(undefined);
      setExtendForm({ days: "7", reason: "" });
      toast.success("Подписка продлена.");
      await refreshCustomer();
    },
    onError: () => toast.error("Не удалось продлить подписку."),
  });
  const contactMutation = useMutation({
    mutationFn: () => adminApi.updateCustomerContact(customerId, { telegramId: contactForm.telegramId, notes: contactForm.notes }),
    onSuccess: async () => {
      toast.success("Контактные данные сохранены.");
      setContactTouched(false);
      await refreshCustomer();
    },
    onError: () => toast.error("Не удалось сохранить контактные данные."),
  });

  const subscriptions = useMemo(() => data?.subscriptions ?? [], [data]);
  const filteredSubscriptions = useMemo(
    () =>
      subscriptions.filter((subscription) => {
        if (brandFilter !== "all" && subscription.brandCode !== brandFilter) return false;
        if (!search) return true;
        const haystack = `${subscription.planName ?? ""} ${subscription.planCode ?? ""} ${subscription.id}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [subscriptions, brandFilter, search],
  );

  const serviceLineOf = (subscription: CustomerSubscriptionSummary): "MAIN" | "WHITELIST" | undefined =>
    (allPlans.data?.items as PlanSummary[] | undefined)?.find((plan) => plan.brandCode === subscription.brandCode && plan.code === subscription.planCode)?.serviceLine;

  const deviceSubscriptions = subscriptions.filter((s) => s.status !== "REVOKED" && s.deviceLimit != null);
  const deviceGroups = useMemo(() => {
    const byBrand = new Map<string, { brandName: string; connected: number[]; limit: number }>();
    for (const subscription of deviceSubscriptions) {
      const membership = data?.memberships.find((m) => m.brandCode === subscription.brandCode);
      const entry = byBrand.get(subscription.brandCode) ?? { brandName: membership?.brandName ?? subscription.brandCode, connected: [], limit: 0 };
      if (subscription.activeDeviceCount != null) entry.connected.push(subscription.activeDeviceCount);
      entry.limit += subscription.deviceLimit ?? 0;
      byBrand.set(subscription.brandCode, entry);
    }
    return [...byBrand.entries()].map(([brandCode, group]) => ({
      brandCode,
      brandName: group.brandName,
      connected: group.connected.length > 0 ? group.connected.reduce((sum, value) => sum + value, 0) : null,
      limit: group.limit,
    }));
  }, [deviceSubscriptions, data?.memberships]);
  const totalConnected = deviceGroups.some((g) => g.connected != null) ? deviceGroups.reduce((sum, g) => sum + (g.connected ?? 0), 0) : null;
  const totalDeviceLimit = deviceGroups.reduce((sum, g) => sum + g.limit, 0);

  const historyEvents = history.data?.events ?? [];

  return (
    <AppShell>
      <Button size="sm" variant="ghost" render={<Link href="/users" />} nativeButton={false} className="-ml-2.5 self-start">
        <ArrowLeftIcon />
        Назад
      </Button>

      {detail.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : detail.isError || !data ? (
        <ErrorState description="Не удалось получить карточку клиента." />
      ) : (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
            <Avatar size="lg">
              <AvatarFallback>{initials(data.email)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-lg font-semibold tracking-tight">{data.email}</h1>
                <StatusBadge status={data.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {data.id} · клиент с {new Date(data.createdAt).toLocaleDateString("ru-RU")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
            <Card className="flex h-full flex-col rounded-2xl">
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Всего принёс денег</p>
                  <p className="text-4xl font-semibold tracking-tight tabular-nums">{formatMoney(data.summary.totalRevenue, data.summary.currency)}</p>
                </div>
                <Badge variant="outline" className="w-fit gap-1.5">
                  <span className={`size-1.5 rounded-full ${data.summary.paymentsCount > 0 ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                  {data.summary.paymentsCount > 0 ? "Платящий клиент" : "Ещё не платил"}
                </Badge>
                <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Платежей всего</span>
                    <span className="tabular-nums">{data.summary.paymentsCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Активных подписок</span>
                    <span className="tabular-nums">{data.summary.activeSubscriptionsCount}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Доход · MAIN</span>
                    <span className="tabular-nums">{formatMoney(data.summary.revenueByServiceLine.find((r) => r.serviceLine === "MAIN")?.amount ?? 0, data.summary.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Доход · WHITELIST</span>
                    <span className="tabular-nums">{formatMoney(data.summary.revenueByServiceLine.find((r) => r.serviceLine === "WHITELIST")?.amount ?? 0, data.summary.currency)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between font-medium">
                    <span>Брендов</span>
                    <span className="tabular-nums">{data.summary.brandsCount}</span>
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
                {data.memberships.map((membership) => (
                  <div key={membership.brandId} className="flex items-center gap-3 py-3">
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
                        {membership.brandCode}
                        {membership.createdAt && ` · рег. ${new Date(membership.createdAt).toLocaleDateString("ru-RU")}`}
                      </p>
                    </div>
                    {membership.id === null ? (
                      <Badge variant="outline" className="shrink-0 text-muted-foreground">
                        Не зарегистрирован
                      </Badge>
                    ) : (
                      <>
                        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{membership.status === "ACTIVE" ? "Активно" : "Приостановлено"}</span>
                        <Switch
                          checked={membership.status === "ACTIVE"}
                          disabled={membershipMutation.isPending}
                          className="shrink-0"
                          onCheckedChange={(checked) =>
                            setMembershipToggle({ id: membership.id as string, brandName: membership.brandName, nextStatus: checked ? "ACTIVE" : "SUSPENDED" })
                          }
                        />
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex w-full flex-col gap-3">
                <div className="flex w-full items-start justify-between gap-2">
                  <div>
                    <CardTitle>Бренды и подписки</CardTitle>
                    <CardDescription>Поиск и фильтр по бренду</CardDescription>
                  </div>
                  <CreateSubscriptionDialog
                    scopedCustomer={{
                      id: data.id,
                      memberships: data.memberships.filter((m) => m.id !== null).map((m) => ({ id: m.id as string, label: m.brandName })),
                    }}
                  />
                </div>
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                  <ToolbarSearch value={search} onChange={setSearch} placeholder="Поиск по тарифу или ID" className="w-auto max-w-80" />
                  <ToggleGroup variant="outline" spacing={0} value={[brandFilter]} onValueChange={(values) => setBrandFilter(values[0] ?? "all")}>
                    <ToggleGroupItem value="all">Все</ToggleGroupItem>
                    {data.memberships.map((membership) => (
                      <ToggleGroupItem key={membership.brandCode} value={membership.brandCode}>
                        {membership.brandName}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
            </CardHeader>
            <CardContent className="divide-y">
              {filteredSubscriptions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Подписок не найдено.</p>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <SubscriptionRow
                    key={subscription.id}
                    subscription={subscription}
                    brandName={data.memberships.find((m) => m.brandCode === subscription.brandCode)?.brandName ?? subscription.brandCode}
                    serviceLine={serviceLineOf(subscription)}
                    revokingSubscriptionId={revokingSubscriptionId}
                    revokeReason={revokeReason}
                    onStartRevoke={(id) => { setRevokingSubscriptionId(id); setRevokeReason(""); }}
                    onCancelRevoke={() => { setRevokingSubscriptionId(undefined); setRevokeReason(""); }}
                    onRevokeReasonChange={setRevokeReason}
                    onConfirmRevoke={(id) => revokeSubscriptionMutation.mutate({ id, reason: revokeReason })}
                    isRevoking={revokeSubscriptionMutation.isPending}
                    extendingSubscriptionId={extendingSubscriptionId}
                    extendForm={extendForm}
                    onStartExtend={(id) => { setExtendingSubscriptionId(id); setExtendForm({ days: "7", reason: "" }); }}
                    onCancelExtend={() => setExtendingSubscriptionId(undefined)}
                    onExtendFormChange={setExtendForm}
                    onConfirmExtend={(id) => extendSubscriptionMutation.mutate({ id, days: Number(extendForm.days), reason: extendForm.reason })}
                    isExtending={extendSubscriptionMutation.isPending}
                  />
                ))
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
                  {totalConnected == null ? (
                    <span className="text-lg font-normal text-muted-foreground">ещё не проверялось</span>
                  ) : (
                    <>
                      {totalConnected} <span className="text-lg font-normal text-muted-foreground">из {totalDeviceLimit}</span>
                    </>
                  )}
                </p>
                <div className="mt-4 flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                  {deviceGroups.length === 0 ? (
                    <p className="text-muted-foreground">Активных подписок с лимитом устройств нет.</p>
                  ) : (
                    deviceGroups.map((group) => (
                      <div key={group.brandCode} className="flex items-center justify-between">
                        <span className="truncate text-muted-foreground">{group.brandName}</span>
                        <span className="shrink-0 tabular-nums">{group.connected == null ? "ещё не проверялось" : `${group.connected} / ${group.limit}`}</span>
                      </div>
                    ))
                  )}
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
                      <Input
                        id="contact-telegram"
                        value={contactForm.telegramId}
                        onChange={(event) => { setContactForm((value) => ({ ...value, telegramId: event.target.value })); setContactTouched(true); }}
                        placeholder="Telegram ID клиента (необязательно)"
                        className="pl-8"
                      />
                    </div>
                    <CopyButton value={contactForm.telegramId} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-email">Email</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <MailIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="contact-email" readOnly value={data.email} className="pl-8" />
                    </div>
                    <CopyButton value={data.email} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-notes">Заметки</Label>
                  <Textarea
                    id="contact-notes"
                    rows={3}
                    maxLength={4000}
                    value={contactForm.notes}
                    onChange={(event) => { setContactForm((value) => ({ ...value, notes: event.target.value })); setContactTouched(true); }}
                    placeholder="Внутренние заметки саппорта (необязательно)"
                  />
                </div>
                <Button size="sm" disabled={!contactTouched || contactMutation.isPending} onClick={() => contactMutation.mutate()}>
                  {contactMutation.isPending && <Spinner />}
                  Сохранить
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Card className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>Статистика использования</CardTitle>
                <CardDescription>График трафика клиента</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <TriangleAlertIcon className="size-4 shrink-0" />
                  Функция в разработке — график ниже с условными данными, не отражает реальный трафик клиента.
                </div>
                <ChartContainer config={trafficChartConfig} className="opacity-50 grayscale">
                  <AreaChart accessibilityLayer data={trafficData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Area dataKey="outgoing" type="natural" fill="var(--color-outgoing)" fillOpacity={0.4} stroke="var(--color-outgoing)" stackId="a" />
                    <Area dataKey="incoming" type="natural" fill="var(--color-incoming)" fillOpacity={0.4} stroke="var(--color-incoming)" stackId="a" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GaugeIcon className="size-4 text-muted-foreground" />
                  Трафик и лимиты
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <TriangleAlertIcon className="size-4 shrink-0" />
                  Функция в разработке — лимиты и стратегия сброса пока нигде не сохраняются.
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="traffic-limit">Лимит трафика</Label>
                  <p className="text-xs text-muted-foreground">0 - неограниченно</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <GaugeIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="traffic-limit" type="number" min={0} defaultValue={0} className="pl-8" disabled />
                    </div>
                    <Select items={[{ value: "GiB", label: "GiB" }, { value: "TiB", label: "TiB" }]} defaultValue="GiB" disabled>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Единица</SelectLabel>
                          <SelectItem value="GiB">GiB</SelectItem>
                          <SelectItem value="TiB">TiB</SelectItem>
                        </SelectGroup>
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
                    disabled
                  >
                    <SelectTrigger id="traffic-reset" className="w-full">
                      <ClockIcon className="text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Стратегия сброса трафика</SelectLabel>
                        <SelectItem value="never">Никогда не сбрасывать</SelectItem>
                        <SelectItem value="daily">Каждый день</SelectItem>
                        <SelectItem value="monthly">Каждый месяц</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>История платежей</CardTitle>
              <CardDescription>Заказы и начисления по всем брендам клиента</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              {history.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : history.isError ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Не удалось получить историю платежей.</p>
              ) : historyEvents.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Платежей пока не было.</p>
              ) : (
                historyEvents.map((event, index) => (
                  <HistoryRow key={`${event.kind}-${event.occurredAt}-${index}`} event={event} icon={historyIconFor(event)} />
                ))
              )}
            </CardContent>
          </Card>

          <AlertDialog open={Boolean(membershipToggle)} onOpenChange={(open) => !open && setMembershipToggle(undefined)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{membershipToggle?.nextStatus === "ACTIVE" ? "Активировать членство?" : "Приостановить членство?"}</AlertDialogTitle>
                <AlertDialogDescription>
                  {membershipToggle?.nextStatus === "ACTIVE"
                    ? `Клиент снова сможет пользоваться брендом «${membershipToggle?.brandName}».`
                    : `Клиент потеряет доступ к бренду «${membershipToggle?.brandName}», пока членство приостановлено.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  variant={membershipToggle?.nextStatus === "ACTIVE" ? "default" : "destructive"}
                  disabled={membershipMutation.isPending}
                  onClick={() => {
                    if (!membershipToggle) return;
                    membershipMutation.mutate({ id: membershipToggle.id, status: membershipToggle.nextStatus }, { onSuccess: () => setMembershipToggle(undefined) });
                  }}
                >
                  {membershipMutation.isPending && <Spinner />}
                  Подтвердить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </AppShell>
  );
}
