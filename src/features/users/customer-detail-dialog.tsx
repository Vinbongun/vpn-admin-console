"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi } from "@/api/client";
import type { CustomerDetail } from "@/api/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { CreateSubscriptionDialog } from "@/features/subscriptions/create-dialog";
import { SubscriptionTokenHistory } from "@/features/users/subscription-token-history";

const liveStatuses = new Set(["PENDING", "TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED"]);

function toLocalDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultIssueDates() {
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return { startsAt: toLocalDateTimeInput(now), expiresAt: toLocalDateTimeInput(expires) };
}

const hasLiveSubscription = (subscriptions: CustomerDetail["subscriptions"], brandCode: string) =>
  subscriptions.some((subscription) => subscription.brandCode === brandCode && liveStatuses.has(subscription.status));

export function CustomerDetailDialog({ customerId, onOpenChange }: { customerId: string | undefined; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [issuingMembershipId, setIssuingMembershipId] = useState<string>();
  const [issueForm, setIssueForm] = useState({ planId: "", startsAt: "", expiresAt: "" });
  const [membershipToggle, setMembershipToggle] = useState<{ id: string; brandName: string; nextStatus: "ACTIVE" | "SUSPENDED" }>();
  const [revokingSubscriptionId, setRevokingSubscriptionId] = useState<string>();
  const [revokeReason, setRevokeReason] = useState("");

  const detail = useQuery({ queryKey: ["admin-customer", customerId], queryFn: () => adminApi.getCustomer(customerId!), enabled: Boolean(customerId), retry: false });
  const plans = useQuery({ queryKey: ["admin-plans", "customer-card"], queryFn: () => adminApi.listPlans({ page: 1, pageSize: 100, status: "ACTIVE" }), retry: false });

  const refreshCustomer = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-customers"] }), queryClient.invalidateQueries({ queryKey: ["admin-customer", customerId] })]);

  const membershipMutation = useMutation({
    mutationFn: ({ id, status: nextStatus }: { id: string; status: "ACTIVE" | "SUSPENDED" }) => adminApi.updateMembership(id, { status: nextStatus }),
    onSuccess: refreshCustomer,
    onError: () => toast.error("Не удалось изменить статус членства."),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status: nextStatus }: { id: string; status: "ACTIVE" | "SUSPENDED" }) => adminApi.updateCustomerStatus(id, { status: nextStatus }),
    onSuccess: refreshCustomer,
    onError: () => toast.error("Не удалось изменить статус клиента."),
  });
  const issueMutation = useMutation({
    mutationFn: (input: { brandMembershipId: string; planId: string; startsAt: string; expiresAt: string }) =>
      adminApi.createSubscription({ brandMembershipId: input.brandMembershipId, ...(input.planId ? { planId: input.planId } : {}), status: "ACTIVE", startsAt: new Date(input.startsAt).toISOString(), expiresAt: new Date(input.expiresAt).toISOString() }),
    onSuccess: async () => {
      setIssuingMembershipId(undefined);
      toast.success("Подписка выдана.");
      await refreshCustomer();
    },
    onError: () => toast.error("Не удалось выдать подписку."),
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

  const startIssuing = (membershipId: string) => {
    setIssuingMembershipId(membershipId);
    setIssueForm({ planId: "", ...defaultIssueDates() });
  };

  return (
    <Dialog open={Boolean(customerId)} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {detail.isLoading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : detail.isError ? (
          <ErrorState className="p-6" description="Не удалось получить карточку клиента." />
        ) : detail.data ? (
          <>
            <DialogHeader className="border-b p-6 pb-4">
              <DialogTitle>{detail.data.email}</DialogTitle>
              <DialogDescription>{detail.data.id}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-6 overflow-y-auto p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge status={detail.data.status} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: detail.data!.id, status: "SUSPENDED" })}>
                    Заблокировать везде
                  </Button>
                  <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: detail.data!.id, status: "ACTIVE" })}>
                    Разблокировать везде
                  </Button>
                  <CreateSubscriptionDialog
                    scopedCustomer={{ id: detail.data.id, memberships: detail.data.memberships.map((membership) => ({ id: membership.id, label: membership.brandCode })) }}
                    trigger={<Button size="sm">Создать подписку</Button>}
                  />
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">Бренды и подписки</p>
                <div className="space-y-4">
                  {detail.data.memberships.map((membership, index) => {
                    const brandPlans = plans.data?.items.filter((plan) => plan.brandCode === membership.brandCode) ?? [];
                    const brandSubscriptions = detail.data!.subscriptions.filter((subscription) => subscription.brandCode === membership.brandCode);
                    const needsSubscription = !hasLiveSubscription(detail.data!.subscriptions, membership.brandCode);
                    return (
                      <div key={membership.id}>
                        {index > 0 && <Separator className="mb-4" />}
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{membership.brandName}</p>
                            <p className="text-xs text-muted-foreground">{membership.brandCode}</p>
                            {membership.createdAt && (
                              <p className="text-xs text-muted-foreground">Регистрация: {new Date(membership.createdAt).toLocaleDateString()}</p>
                            )}
                            {membership.portalUrl && (
                              <a href={membership.portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                <ExternalLinkIcon className="size-3" />
                                Открыть ЛК бренда
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{membership.status === "ACTIVE" ? "Активно" : "Приостановлено"}</span>
                            <Switch
                              checked={membership.status === "ACTIVE"}
                              disabled={membershipMutation.isPending}
                              onCheckedChange={(checked) =>
                                setMembershipToggle({ id: membership.id, brandName: membership.brandName, nextStatus: checked ? "ACTIVE" : "SUSPENDED" })
                              }
                            />
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {brandSubscriptions.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Подписок на этот бренд нет.</p>
                          ) : (
                            brandSubscriptions.map((subscription) => (
                              <div key={subscription.id} className="rounded-lg border p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="font-medium">{subscription.planName ?? subscription.planCode ?? "Без плана"}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(subscription.startsAt).toLocaleDateString()} – {new Date(subscription.expiresAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <StatusBadge status={subscription.status} />
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
                                {liveStatuses.has(subscription.status) && (
                                  <div className="mt-3">
                                    {revokingSubscriptionId === subscription.id ? (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Input
                                          aria-label="Причина отключения"
                                          placeholder="Причина отключения"
                                          className="max-w-52"
                                          value={revokeReason}
                                          onChange={(event) => setRevokeReason(event.target.value)}
                                        />
                                        <ConfirmDialog
                                          trigger={
                                            <Button size="sm" variant="destructive" disabled={!revokeReason || revokeSubscriptionMutation.isPending}>
                                              Отключить
                                            </Button>
                                          }
                                          title="Отключить подписку?"
                                          description={`Клиент немедленно потеряет доступ ко всем группам endpoint'ов этой подписки. Причина: «${revokeReason}».`}
                                          confirmLabel="Отключить"
                                          isPending={revokeSubscriptionMutation.isPending}
                                          onConfirm={() => revokeSubscriptionMutation.mutate({ id: subscription.id, reason: revokeReason })}
                                        />
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setRevokingSubscriptionId(undefined);
                                            setRevokeReason("");
                                          }}
                                        >
                                          Отмена
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setRevokingSubscriptionId(subscription.id);
                                          setRevokeReason("");
                                        }}
                                      >
                                        Отключить подписку
                                      </Button>
                                    )}
                                  </div>
                                )}
                                <div className="mt-3">
                                  <SubscriptionTokenHistory tokens={subscription.tokens} />
                                </div>
                              </div>
                            ))
                          )}

                          {needsSubscription && issuingMembershipId !== membership.id && (
                            <Button size="sm" onClick={() => startIssuing(membership.id)}>
                              Выдать подписку
                            </Button>
                          )}
                          {needsSubscription && issuingMembershipId === membership.id && (
                            <FieldGroup className="gap-3 rounded-lg border border-dashed p-3">
                              <p className="text-xs text-muted-foreground">У клиента нет активной подписки на этот бренд — выберите тариф и период.</p>
                              <Field>
                                <FieldLabel htmlFor={`plan-${membership.id}`}>Тариф</FieldLabel>
                                <Select
                                  items={brandPlans.map((plan) => ({ value: plan.id, label: plan.name }))}
                                  value={issueForm.planId}
                                  onValueChange={(value) => setIssueForm((value_) => ({ ...value_, planId: value ?? "" }))}
                                >
                                  <SelectTrigger id={`plan-${membership.id}`} className="w-full">
                                    <SelectValue placeholder="Без тарифа" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {brandPlans.map((plan) => (
                                      <SelectItem key={plan.id} value={plan.id}>
                                        {plan.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </Field>
                              <div className="grid grid-cols-2 gap-2">
                                <Field>
                                  <FieldLabel htmlFor={`starts-${membership.id}`}>Начало</FieldLabel>
                                  <Input id={`starts-${membership.id}`} type="datetime-local" value={issueForm.startsAt} onChange={(event) => setIssueForm((value) => ({ ...value, startsAt: event.target.value }))} />
                                </Field>
                                <Field>
                                  <FieldLabel htmlFor={`expires-${membership.id}`}>Окончание</FieldLabel>
                                  <Input id={`expires-${membership.id}`} type="datetime-local" value={issueForm.expiresAt} onChange={(event) => setIssueForm((value) => ({ ...value, expiresAt: event.target.value }))} />
                                </Field>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" disabled={issueMutation.isPending} onClick={() => issueMutation.mutate({ brandMembershipId: membership.id, ...issueForm })}>
                                  {issueMutation.isPending && <Spinner />}
                                  Выдать
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setIssuingMembershipId(undefined)}>
                                  Отмена
                                </Button>
                              </div>
                            </FieldGroup>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

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
                      membershipMutation.mutate(
                        { id: membershipToggle.id, status: membershipToggle.nextStatus },
                        { onSuccess: () => setMembershipToggle(undefined) },
                      );
                    }}
                  >
                    {membershipMutation.isPending && <Spinner />}
                    Подтвердить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
