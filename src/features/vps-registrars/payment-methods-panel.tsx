"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsPaymentMethod } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

const methodTypes = [
  { value: "STORED_CARD_SBP", label: "Карта/СБП" },
  { value: "PERSONAL_ACCOUNT", label: "Лицевой счёт" },
] as const;
type MethodType = (typeof methodTypes)[number]["value"];

type MethodForm = { methodType: MethodType; paymethodId: string; recurringRef: string; displayName: string; isDefault: boolean };
const emptyForm: MethodForm = { methodType: "STORED_CARD_SBP", paymethodId: "", recurringRef: "", displayName: "", isDefault: false };
const formFrom = (method: VpsPaymentMethod): MethodForm => ({
  methodType: method.methodType,
  paymethodId: String(method.paymethodId),
  recurringRef: method.recurringRef ?? "",
  displayName: method.displayName,
  isDefault: method.isDefault,
});

// PERSONAL_ACCOUNT has no real numeric paymethod in QWINS at all (identified by button name, not id) -
// backend just needs some integer in the column and never reads it for this method type, so keep the
// field disabled at 0 rather than asking the admin to invent a meaningless number.
function PaymethodIdField({ form, setForm, idPrefix }: { form: MethodForm; setForm: (updater: (prev: MethodForm) => MethodForm) => void; idPrefix: string }) {
  const isPersonalAccount = form.methodType === "PERSONAL_ACCOUNT";
  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-paymethod-id`}>ID способа у регистратора (paymethodId)</Label>
      <Input
        id={`${idPrefix}-paymethod-id`}
        type="number"
        disabled={isPersonalAccount}
        value={isPersonalAccount ? "0" : form.paymethodId}
        onChange={(event) => setForm((prev) => ({ ...prev, paymethodId: event.target.value }))}
      />
      {isPersonalAccount && <p className="text-xs text-muted-foreground">У лицевого счёта нет числового paymethod у этого регистратора — значение не используется.</p>}
    </div>
  );
}

function AddPaymentMethodDialog({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MethodForm>(emptyForm);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.addVpsPaymentMethod(accountId, {
        methodType: form.methodType,
        paymethodId: form.methodType === "PERSONAL_ACCOUNT" ? 0 : Number(form.paymethodId),
        displayName: form.displayName.trim(),
        isDefault: form.isDefault,
        ...(form.recurringRef.trim() ? { recurringRef: form.recurringRef.trim() } : {}),
      }),
    onSuccess: async () => {
      toast.success("Способ оплаты добавлен.");
      setOpen(false);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["admin-vps-payment-methods", accountId] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось добавить способ оплаты."),
  });

  const canSubmit = Boolean((form.methodType === "PERSONAL_ACCOUNT" || form.paymethodId.trim()) && form.displayName.trim()) && !mutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setForm(emptyForm);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <PlusIcon />
            Добавить способ оплаты
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Добавить способ оплаты</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="space-y-2">
            <Label>Тип</Label>
            <Select items={methodTypes} value={form.methodType} onValueChange={(value) => setForm((prev) => ({ ...prev, methodType: (value as MethodType) ?? "STORED_CARD_SBP" }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Тип</SelectLabel>
                  {methodTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <PaymethodIdField form={form} setForm={setForm} idPrefix="add" />
          <div className="space-y-2">
            <Label htmlFor="payment-method-recurring">Recurring ref (необязательно)</Label>
            <Input id="payment-method-recurring" value={form.recurringRef} onChange={(event) => setForm((prev) => ({ ...prev, recurringRef: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-method-name">Название для отображения</Label>
            <Input id="payment-method-name" placeholder="Карта/СБП" value={form.displayName} onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="payment-method-default">Способ по умолчанию</Label>
            <Switch id="payment-method-default" checked={form.isDefault} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isDefault: checked }))} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button disabled={!canSubmit} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPaymentMethodDialog({ accountId, method }: { accountId: string; method: VpsPaymentMethod }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MethodForm>(() => formFrom(method));
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateVpsPaymentMethod(accountId, method.id, {
        paymethodId: form.methodType === "PERSONAL_ACCOUNT" ? 0 : Number(form.paymethodId),
        displayName: form.displayName.trim(),
        isDefault: form.isDefault,
        recurringRef: form.recurringRef.trim() || undefined,
      }),
    onSuccess: async () => {
      toast.success("Способ оплаты обновлён.");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-vps-payment-methods", accountId] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось сохранить способ оплаты."),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setForm(formFrom(method));
      }}
    >
      <DialogTrigger render={<Button size="icon-sm" variant="ghost" title="Редактировать" />}>
        <PencilIcon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Редактировать способ оплаты</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <PaymethodIdField form={form} setForm={setForm} idPrefix="edit" />
          <div className="space-y-2">
            <Label htmlFor="edit-payment-method-recurring">Recurring ref (необязательно)</Label>
            <Input id="edit-payment-method-recurring" value={form.recurringRef} onChange={(event) => setForm((prev) => ({ ...prev, recurringRef: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-payment-method-name">Название для отображения</Label>
            <Input id="edit-payment-method-name" value={form.displayName} onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="edit-payment-method-default">Способ по умолчанию</Label>
            <Switch id="edit-payment-method-default" checked={form.isDefault} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isDefault: checked }))} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button disabled={!form.displayName.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeletePaymentMethodDialog({ accountId, method }: { accountId: string; method: VpsPaymentMethod }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => adminApi.deleteVpsPaymentMethod(accountId, method.id),
    onSuccess: async () => {
      toast.success("Способ оплаты удалён.");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-vps-payment-methods", accountId] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось удалить способ оплаты."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon-sm" variant="ghost" title="Удалить" />}>
        <TrashIcon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Удалить способ оплаты «{method.displayName}»?</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function usePaymentMethods(accountId: string) {
  return useQuery({ queryKey: ["admin-vps-payment-methods", accountId], queryFn: () => adminApi.listVpsPaymentMethods(accountId), retry: false });
}

export function PaymentMethodsPanel({ accountId, mayWrite }: { accountId: string; mayWrite: boolean }) {
  const methods = usePaymentMethods(accountId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Способы оплаты</CardTitle>
        <CardDescription>Карта/СБП и лицевой счёт — реальные деньги списываются только когда владелец платформы включит боевую оплату</CardDescription>
        <CardAction>{mayWrite && <AddPaymentMethodDialog accountId={accountId} />}</CardAction>
      </CardHeader>
      <CardContent>
        {methods.isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        ) : methods.isError ? (
          <p className="text-sm text-destructive">Не удалось получить способы оплаты.</p>
        ) : !methods.data || methods.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Способов оплаты пока нет.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {methods.data.map((method) => (
              <div key={method.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm">
                <span className="font-medium">{method.displayName}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{method.methodType === "STORED_CARD_SBP" ? "Карта/СБП" : "Лицевой счёт"}</Badge>
                  {method.isDefault && <Badge>По умолчанию</Badge>}
                  {mayWrite && (
                    <>
                      <EditPaymentMethodDialog accountId={accountId} method={method} />
                      <DeletePaymentMethodDialog accountId={accountId} method={method} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
