"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
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

function AddPaymentMethodDialog({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  const [methodType, setMethodType] = useState<(typeof methodTypes)[number]["value"]>("STORED_CARD_SBP");
  const [paymethodId, setPaymethodId] = useState("");
  const [recurringRef, setRecurringRef] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const queryClient = useQueryClient();

  const reset = () => {
    setMethodType("STORED_CARD_SBP");
    setPaymethodId("");
    setRecurringRef("");
    setDisplayName("");
    setIsDefault(false);
  };

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.addVpsPaymentMethod(accountId, {
        methodType,
        paymethodId: paymethodId.trim(),
        displayName: displayName.trim(),
        isDefault,
        ...(recurringRef.trim() ? { recurringRef: recurringRef.trim() } : {}),
      }),
    onSuccess: async () => {
      toast.success("Способ оплаты добавлен.");
      setOpen(false);
      reset();
      await queryClient.invalidateQueries({ queryKey: ["admin-vps-payment-methods", accountId] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось добавить способ оплаты."),
  });

  const canSubmit = Boolean(paymethodId.trim() && displayName.trim()) && !mutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
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
            <Select items={methodTypes} value={methodType} onValueChange={(value) => setMethodType((value as typeof methodType) ?? "STORED_CARD_SBP")}>
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
          <div className="space-y-2">
            <Label htmlFor="payment-method-id">ID способа у регистратора (paymethodId)</Label>
            <Input id="payment-method-id" value={paymethodId} onChange={(event) => setPaymethodId(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-method-recurring">Recurring ref (необязательно)</Label>
            <Input id="payment-method-recurring" value={recurringRef} onChange={(event) => setRecurringRef(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-method-name">Название для отображения</Label>
            <Input id="payment-method-name" placeholder="Карта/СБП" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="payment-method-default">Способ по умолчанию</Label>
            <Switch id="payment-method-default" checked={isDefault} onCheckedChange={setIsDefault} />
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
            {methods.data.map((method: VpsPaymentMethod) => (
              <div key={method.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm">
                <span className="font-medium">{method.displayName}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{method.methodType === "STORED_CARD_SBP" ? "Карта/СБП" : "Лицевой счёт"}</Badge>
                  {method.isDefault && <Badge>По умолчанию</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
