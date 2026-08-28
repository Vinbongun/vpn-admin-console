"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsPaymentMethod, VpsTariff } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

// The backend's own real-purchase guard throws a plain Error ("...this would spend real money...
// Set QWINS_ALLOW_REAL_PURCHASE=true...") that isn't currently mapped to a clean 4xx body by the
// purchase endpoint - matching on this substring is the best a frontend can do without a backend
// change; anything else falls back to the raw message.
function isRealPurchaseDisabled(message: string): boolean {
  return /QWINS_ALLOW_REAL_PURCHASE|spend real money/i.test(message);
}

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  const text = (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
  return isRealPurchaseDisabled(text) ? "Реальная покупка временно отключена владельцем платформы." : text;
}

const defaultOsTemplate = "VM6_ISPsystem repository_Ubuntu-24.04";

export function PurchaseVpsDialog({
  registrarAccountId,
  tariff,
  paymentMethods,
}: {
  registrarAccountId: string;
  tariff: VpsTariff;
  paymentMethods: VpsPaymentMethod[];
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"options" | "polling">("options");
  const [orderCount, setOrderCount] = useState("1");
  const [paymentMethodId, setPaymentMethodId] = useState(() => paymentMethods.find((method) => method.isDefault)?.id ?? paymentMethods[0]?.id ?? "");
  const [autoProlong, setAutoProlong] = useState(true);
  const [operationId, setOperationId] = useState<string>();
  // Generated once per dialog session (not per click) and reused across retries after a network
  // error, so a resubmit of the same form never double-orders.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const queryClient = useQueryClient();

  const reset = () => {
    setStep("options");
    setOrderCount("1");
    setAutoProlong(true);
    setOperationId(undefined);
  };

  const purchaseMutation = useMutation({
    mutationFn: () =>
      adminApi.purchaseVps(registrarAccountId, {
        datacenterId: tariff.datacenterId,
        period: "1",
        pricelistId: tariff.pricelistId,
        osTemplate: defaultOsTemplate,
        orderCount: Number(orderCount),
        autoProlong,
        paymentMethodId,
        idempotencyKey,
      }),
    onSuccess: (operation) => {
      setOperationId(operation.id);
      setStep("polling");
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось начать покупку."),
  });

  const operation = useQuery({
    queryKey: ["admin-vps-purchase-operation", operationId],
    queryFn: () => adminApi.advanceVpsPurchaseOperation(operationId!),
    enabled: step === "polling" && Boolean(operationId),
    retry: false,
    refetchInterval: (query) => (query.state.data?.stage === "CREDENTIALS_RETRIEVED" || query.state.data?.stage === "FAILED" ? false : 3000),
  });

  useEffect(() => {
    if (operation.data?.stage === "CREDENTIALS_RETRIEVED") queryClient.invalidateQueries({ queryKey: ["admin-vps-instances"] });
  }, [operation.data?.stage, queryClient]);

  const canSubmit = Boolean(paymentMethodId) && Number(orderCount) >= 1 && Number(orderCount) <= 50 && !purchaseMutation.isPending;
  const tariffPrice = tariff.priceCents != null && tariff.priceCurrency ? `${(tariff.priceCents / 100).toFixed(2)} ${tariff.priceCurrency}/мес` : (tariff.rawLabel ?? "");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        disabled={paymentMethods.length === 0}
        render={<Button size="sm" title={paymentMethods.length === 0 ? "Сначала добавьте способ оплаты" : undefined} />}
      >
        Купить
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Купить сервер — {tariff.datacenterName}
            {tariffPrice ? `, ${tariffPrice}` : ""}
          </DialogTitle>
        </DialogHeader>

        {step === "options" ? (
          <>
            <div className="flex flex-col gap-3">
              <div className="space-y-2">
                <Label htmlFor="vps-order-count">Количество серверов</Label>
                <Input id="vps-order-count" type="number" min={1} max={50} value={orderCount} onChange={(event) => setOrderCount(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Способ оплаты</Label>
                <Select
                  items={paymentMethods.map((method) => ({ value: method.id, label: method.displayName }))}
                  value={paymentMethodId}
                  onValueChange={(value) => setPaymentMethodId(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите способ оплаты" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Способ оплаты</SelectLabel>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.displayName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="vps-purchase-auto-prolong">Авто-продление</Label>
                <Switch id="vps-purchase-auto-prolong" checked={autoProlong} onCheckedChange={setAutoProlong} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
              <Button disabled={!canSubmit} onClick={() => purchaseMutation.mutate()}>
                {purchaseMutation.isPending && <Spinner />}
                Купить
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {!operation.data ? (
                <p className="text-sm text-muted-foreground">Запускаем покупку…</p>
              ) : operation.data.stage === "FAILED" ? (
                <p className="text-sm text-destructive">{operation.data.errorMessage ? apiErrorMessage(new ApiError(0, { message: operation.data.errorMessage })) : "Покупка не удалась."}</p>
              ) : operation.data.stage === "CREDENTIALS_RETRIEVED" ? (
                <p className="text-sm text-muted-foreground">
                  Сервер{Number(orderCount) > 1 ? "ы" : ""} активирован{Number(orderCount) > 1 ? "ы" : ""}, учётные данные получены.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Стадия: {operation.data.stage}… (обычно занимает до нескольких минут)</p>
              )}
            </div>
            <DialogFooter>
              {operation.data?.stage === "CREDENTIALS_RETRIEVED" && (
                <Button render={<Link href="/infrastructure/panels-and-servers" />} nativeButton={false} onClick={() => setOpen(false)}>
                  Перейти к серверам
                </Button>
              )}
              <DialogClose render={<Button type="button" variant="outline" />}>Закрыть</DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
