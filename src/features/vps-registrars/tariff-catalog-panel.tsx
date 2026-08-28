"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsTariff } from "@/api/types";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { usePaymentMethods } from "@/features/vps-registrars/payment-methods-panel";
import { PurchaseVpsDialog } from "@/features/vps-registrars/purchase-vps-dialog";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function TariffCard({ tariff, action }: { tariff: VpsTariff; action?: React.ReactNode }) {
  const hasSpecs = tariff.vcpuCount != null && tariff.ramGb != null && tariff.diskGb != null;
  const price = tariff.priceCents != null && tariff.priceCurrency ? `${(tariff.priceCents / 100).toFixed(2)} ${tariff.priceCurrency}/мес` : (tariff.rawLabel ?? "—");

  return (
    <Card className="gap-2 p-4">
      <p className="text-sm font-medium">{price}</p>
      {hasSpecs ? (
        <p className="text-xs text-muted-foreground">
          {tariff.vcpuCount} vCPU · {tariff.ramGb} ГБ ОЗУ · {tariff.diskGb} ГБ диск
          {tariff.networkSpeedLabel ? ` · ${tariff.networkSpeedLabel}` : ""}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{tariff.rawLabel ?? "Характеристики не распознаны"}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </Card>
  );
}

export function TariffCatalogPanel({ accountId, mayWrite }: { accountId: string; mayWrite: boolean }) {
  const [activeDatacenter, setActiveDatacenter] = useState<string>();
  const queryClient = useQueryClient();

  const catalog = useQuery({ queryKey: ["admin-vps-catalog", accountId], queryFn: () => adminApi.listVpsTariffCatalog(accountId), retry: false });
  const paymentMethods = usePaymentMethods(accountId);

  const syncMutation = useMutation({
    mutationFn: () => adminApi.syncVpsTariffCatalog(accountId),
    onSuccess: async (result) => {
      toast.success(`Синхронизировано тарифов: ${result.synced ?? 0}.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-vps-catalog", accountId] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось синхронизировать каталог тарифов."),
  });

  const datacenters = useMemo(() => {
    const map = new Map<string, string>();
    for (const tariff of catalog.data ?? []) map.set(tariff.datacenterId, tariff.datacenterName);
    return [...map.entries()];
  }, [catalog.data]);
  const currentDatacenter = activeDatacenter ?? datacenters[0]?.[0];
  const tariffsForDatacenter = (catalog.data ?? []).filter((tariff) => tariff.datacenterId === currentDatacenter);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Каталог тарифов QWINS</CardTitle>
        <CardDescription>Локальный кэш — обновляется вручную, не по расписанию</CardDescription>
        <CardAction>
          {mayWrite && (
            <Button size="sm" variant="outline" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
              {syncMutation.isPending && <Spinner />}
              Обновить тарифы
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {catalog.isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка каталога…</p>
        ) : catalog.isError ? (
          <p className="text-sm text-destructive">Не удалось получить каталог тарифов.</p>
        ) : datacenters.length === 0 ? (
          <p className="text-sm text-muted-foreground">Каталог пуст — нажмите «Обновить тарифы».</p>
        ) : (
          <>
            <Tabs value={currentDatacenter} onValueChange={(value) => setActiveDatacenter(value ?? undefined)}>
              <TabsList>
                {datacenters.map(([id, name]) => (
                  <TabsTrigger key={id} value={id}>
                    {name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tariffsForDatacenter.map((tariff) => (
                <TariffCard
                  key={tariff.pricelistId}
                  tariff={tariff}
                  action={mayWrite && <PurchaseVpsDialog registrarAccountId={accountId} tariff={tariff} paymentMethods={paymentMethods.data ?? []} />}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
