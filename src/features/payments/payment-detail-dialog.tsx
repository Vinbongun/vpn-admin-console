"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConicalIcon } from "lucide-react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { PaymentDetail, PaymentGatewayLog } from "@/api/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function apiErrorMessage(error: ApiError): string {
  if (error.status === 409) return "Вернуть можно только успешный платёж.";
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

const eventTypeLabels: Record<string, string> = {
  CHARGE_ATTEMPT: "Попытка списания",
  CHARGE_RESULT: "Результат списания",
  REFUND_REQUESTED: "Запрошен возврат",
  REFUND_RESULT: "Результат возврата",
};

export function PaymentDetailDialog({ paymentId, onOpenChange, mayWrite }: { paymentId: string | undefined; onOpenChange: (open: boolean) => void; mayWrite: boolean }) {
  return (
    <Dialog open={Boolean(paymentId)} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {paymentId && <PaymentDetailBody key={paymentId} paymentId={paymentId} mayWrite={mayWrite} />}
      </DialogContent>
    </Dialog>
  );
}

function PaymentDetailBody({ paymentId, mayWrite }: { paymentId: string; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ["admin-payment", paymentId], queryFn: () => adminApi.getPayment(paymentId), retry: false });

  const refundMutation = useMutation({
    mutationFn: (simulateFailure: boolean) => adminApi.refundPayment(paymentId, { simulateFailure }),
    onSuccess: async (result) => {
      if (result.refunded) toast.success("Платёж возвращён, доступ клиента отозван.");
      else toast.error(result.reason === "SIMULATED_FAILURE" ? "Тест: возврат не удался (симуляция)." : "Возврат не удался.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-payment", paymentId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-payments-summary"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось выполнить возврат."),
  });

  if (detail.isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }
  if (detail.isError || !detail.data) {
    return <ErrorState className="p-6" description="Не удалось получить детали платежа." />;
  }

  const payment: PaymentDetail = detail.data;
  const logs = [...payment.logs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <>
      <DialogHeader className="border-b p-6 pb-4">
        <DialogTitle className="flex items-center gap-2">
          {payment.amount} {payment.currency}
          <StatusBadge status={payment.status} />
        </DialogTitle>
        <DialogDescription>
          {payment.customerEmail} · {payment.id}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-6 overflow-y-auto p-6">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Дата</dt>
          <dd>{formatDate(payment.createdAt)}</dd>
          <dt className="text-muted-foreground">Бренд</dt>
          <dd>{payment.brandCode}</dd>
          <dt className="text-muted-foreground">Тариф</dt>
          <dd>{payment.planName ?? payment.planCode}</dd>
          <dt className="text-muted-foreground">Тип</dt>
          <dd>{payment.kind}</dd>
          <dt className="text-muted-foreground">Заказ</dt>
          <dd className="truncate">{payment.orderId}</dd>
          <dt className="text-muted-foreground">Подписка</dt>
          <dd className="truncate">{payment.subscriptionId ?? "—"}</dd>
          <dt className="text-muted-foreground">Шлюз</dt>
          <dd>{payment.gatewayCode ?? "—"}</dd>
          <dt className="text-muted-foreground">Способ оплаты</dt>
          <dd>
            {payment.methodName ?? payment.methodCode ?? "—"}
            {payment.maskedPan && <span className="ml-1 text-muted-foreground">({payment.maskedPan})</span>}
          </dd>
          {payment.failureReason && (
            <>
              <dt className="text-muted-foreground">Причина отказа</dt>
              <dd className="text-destructive">{payment.failureReason}</dd>
            </>
          )}
          {payment.refundedAt && (
            <>
              <dt className="text-muted-foreground">Возвращён</dt>
              <dd>{formatDate(payment.refundedAt)}</dd>
            </>
          )}
        </dl>

        {mayWrite && payment.status === "SUCCEEDED" && (
          <div className="flex flex-wrap items-center gap-2">
            <ConfirmDialog
              trigger={<Button disabled={refundMutation.isPending}>Вернуть платёж</Button>}
              title="Вернуть платёж?"
              description="Отзовёт доступ у клиента немедленно — это реальное действие, не только финансовая запись."
              confirmLabel="Вернуть"
              isPending={refundMutation.isPending}
              onConfirm={() => refundMutation.mutate(false)}
            />
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm" disabled={refundMutation.isPending} className="text-muted-foreground">
                  <FlaskConicalIcon />
                  Тест: сымитировать неуспешный возврат
                </Button>
              }
              title="Тестовый вызов"
              description="Симулирует отказ возврата (тот же endpoint с simulateFailure: true) — доступ клиента не изменится. Кнопка будет удалена, когда подключится настоящий платёжный шлюз."
              confirmLabel="Вызвать"
              destructive={false}
              isPending={refundMutation.isPending}
              onConfirm={() => refundMutation.mutate(true)}
            />
          </div>
        )}

        <Separator />

        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground">История событий</p>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Событий пока нет.</p>
          ) : (
            <ol className="flex flex-col gap-3 border-l pl-4">
              {logs.map((log) => (
                <LogEntry key={log.id} log={log} />
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  );
}

function LogEntry({ log }: { log: PaymentGatewayLog }) {
  const hasPayload = log.payload && Object.keys(log.payload).length > 0;
  return (
    <li className="relative">
      <div className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-border" />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{eventTypeLabels[log.eventType] ?? log.eventType}</span>
        <StatusBadge status={log.level} />
        <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{log.message}</p>
      {hasPayload && (
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">payload</summary>
          <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs">{JSON.stringify(log.payload, null, 2)}</pre>
        </details>
      )}
    </li>
  );
}
