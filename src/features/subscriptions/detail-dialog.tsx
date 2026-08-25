"use client";

import { useQuery } from "@tanstack/react-query";
import { UserIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { IssuedSubscriptionToken, PlanSummary, SubscriptionDetail, SubscriptionSummary } from "@/api/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DevicesSection } from "@/features/subscriptions/devices-section";
import { ErrorState } from "@/components/error-state";
import { subscriptionStatuses } from "@/features/subscriptions/schema";
import { useRevokeSubscriptionMutation, useRotateSubscriptionTokenMutation, useSubscription, useUpdateSubscriptionMutation } from "@/features/subscriptions/queries";
import { can } from "@/lib/access-control";

type Status = SubscriptionSummary["status"];

export function SubscriptionDetailDialog({ subscriptionId, onOpenChange, staff }: { subscriptionId: string | undefined; onOpenChange: (open: boolean) => void; staff: { permissions: string[] } | undefined }) {
  const detail = useSubscription(subscriptionId);
  const plans = useQuery({ queryKey: ["admin-plans", "subscription-detail"], queryFn: () => adminApi.listPlans({ page: 1, pageSize: 100, status: "ACTIVE" }), retry: false });
  const mayWrite = can(staff, "subscriptions.write");
  const mayViewCustomer = can(staff, "customers.read");

  return (
    <Dialog open={Boolean(subscriptionId)} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {detail.isLoading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : detail.isError ? (
          <ErrorState className="p-6" description="Не удалось получить детали подписки." />
        ) : detail.data ? (
          <SubscriptionDetailBody key={detail.data.id} subscription={detail.data} plans={plans.data?.items ?? []} mayWrite={mayWrite} mayViewCustomer={mayViewCustomer} onClose={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionDetailBody({
  subscription,
  plans,
  mayWrite,
  mayViewCustomer,
  onClose,
}: {
  subscription: SubscriptionDetail;
  plans: PlanSummary[];
  mayWrite: boolean;
  mayViewCustomer: boolean;
  onClose: () => void;
}) {
  const [editStatus, setEditStatus] = useState<Status>(subscription.status);
  const [editPlanId, setEditPlanId] = useState("none");
  const [reason, setReason] = useState("");
  const [issuedToken, setIssuedToken] = useState<IssuedSubscriptionToken>();

  const updateMutation = useUpdateSubscriptionMutation(subscription.id);
  const revokeMutation = useRevokeSubscriptionMutation(subscription.id, onClose);
  const rotateMutation = useRotateSubscriptionTokenMutation(setIssuedToken);

  return (
    <>
      <DialogHeader className="border-b p-6 pb-4">
        <DialogTitle>{subscription.customerEmail}</DialogTitle>
        <DialogDescription>{subscription.id}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-6 overflow-y-auto p-6">
        {mayViewCustomer && subscription.customerId && (
          <Button
            size="sm"
            variant="outline"
            className="self-start"
            render={<Link href={`/users?customerId=${subscription.customerId}`} />}
            nativeButton={false}
          >
            <UserIcon />
            Перейти к клиенту
          </Button>
        )}
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Привязка к бренду</dt>
          <dd className="truncate">{subscription.brandMembershipId ?? "—"}</dd>
          <dt className="text-muted-foreground">Тариф</dt>
          <dd>{subscription.planCode ?? "Без тарифа"}</dd>
          <dt className="text-muted-foreground">Версия записи</dt>
          <dd>{subscription.revision}</dd>
        </dl>

        <Separator />

        <DevicesSection
          subscriptionId={subscription.id}
          deviceLimit={subscription.plan?.deviceLimit}
          activeDeviceCount={subscription.activeDeviceCount}
          activeDeviceCountCheckedAt={subscription.activeDeviceCountCheckedAt}
          mayWrite={mayWrite}
        />

        {issuedToken && (
          <Alert className="border-amber-500/50">
            <AlertTitle>Новый токен — сохраните сейчас</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>Токен в открытом виде возвращается сервером только один раз и не сохраняется интерфейсом.</p>
              <code className="block break-all rounded-md bg-muted p-3 text-xs text-foreground">{issuedToken.token}</code>
              <Button size="sm" variant="outline" onClick={() => setIssuedToken(undefined)}>
                Скрыть
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {mayWrite && (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="detail-plan">Тариф</FieldLabel>
              <Select
                items={[{ value: "none", label: "Без изменений" }, ...plans.map((plan) => ({ value: plan.id, label: `${plan.brandCode} · ${plan.name}` }))]}
                value={editPlanId}
                onValueChange={(value) => setEditPlanId(value ?? "none")}
              >
                <SelectTrigger id="detail-plan" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без изменений</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.brandCode} · {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="detail-status">Статус подписки</FieldLabel>
              <Select
                items={subscriptionStatuses.map((value) => ({ value, label: value }))}
                value={editStatus}
                onValueChange={(value) => setEditStatus((value as Status) ?? subscription.status)}
              >
                <SelectTrigger id="detail-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionStatuses.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="detail-reason">Причина изменения</FieldLabel>
              <Input id="detail-reason" placeholder="Причина изменения" value={reason} onChange={(event) => setReason(event.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!reason || updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: subscription.id, body: { status: editStatus, planId: editPlanId !== "none" ? editPlanId : undefined, reason } })}
              >
                {updateMutation.isPending && <Spinner />}
                Сохранить
              </Button>
              <Button variant="outline" disabled={rotateMutation.isPending} onClick={() => rotateMutation.mutate(subscription.id)}>
                {rotateMutation.isPending && <Spinner />}
                Обновить токен
              </Button>
              <ConfirmDialog
                trigger={
                  <Button variant="destructive" disabled={!reason || revokeMutation.isPending}>
                    Отозвать
                  </Button>
                }
                title="Отозвать подписку?"
                description={`Клиент немедленно потеряет доступ ко всем группам endpoint'ов этой подписки. Причина: «${reason}».`}
                confirmLabel="Отозвать"
                isPending={revokeMutation.isPending}
                onConfirm={() => revokeMutation.mutate({ id: subscription.id, reason })}
              />
            </div>
          </FieldGroup>
        )}
      </div>
    </>
  );
}
