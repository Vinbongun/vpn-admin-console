"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateGatewayDialog } from "@/features/payments/create-gateway-dialog";
import { EditGatewayDialog } from "@/features/payments/edit-gateway-dialog";
import { MethodDialog } from "@/features/payments/method-dialog";
import { RotateGatewayCredentialsDialog } from "@/features/payments/rotate-gateway-credentials-dialog";
import { can } from "@/lib/access-control";

export default function PaymentGatewaysPage() {
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "finance.write");
  const gateways = useQuery({ queryKey: ["admin-payment-gateways"], queryFn: adminApi.listPaymentGateways, retry: false });

  return (
    <AppShell>
      <PageHeader
        title="Настройки платежей"
        description="Платёжные шлюзы и способы оплаты — «удаление» это статус INACTIVE, платежи хранят на них ссылку"
        actions={mayWrite && <CreateGatewayDialog />}
      />

      {gateways.isLoading ? (
        <LoadingState />
      ) : gateways.isError ? (
        <ErrorState description="Не удалось получить платёжные шлюзы." />
      ) : !gateways.data || gateways.data.length === 0 ? (
        <EmptyState title="Шлюзов пока нет" description="Добавьте первый платёжный шлюз, чтобы бренды могли принимать оплату." />
      ) : (
        <div className="flex flex-col gap-4">
          {gateways.data.map((gateway) => (
            <Card key={gateway.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {gateway.name}
                    <StatusBadge status={gateway.status} />
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {gateway.code} · {gateway.credentialsStored ? "credentials заданы" : "credentials не заданы"}
                  </p>
                </div>
                {mayWrite && (
                  <div className="flex flex-wrap gap-2">
                    <EditGatewayDialog gateway={gateway} />
                    <RotateGatewayCredentialsDialog gatewayId={gateway.id} gatewayName={gateway.name} />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Способы оплаты</p>
                  {mayWrite && <MethodDialog gatewayId={gateway.id} />}
                </div>
                {gateway.methods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Способы оплаты не добавлены.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {gateway.methods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{method.name}</p>
                          <p className="text-xs text-muted-foreground">{method.code}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={method.status} />
                          {mayWrite && <MethodDialog gatewayId={gateway.id} method={method} />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
