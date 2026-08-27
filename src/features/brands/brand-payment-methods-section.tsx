"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { BrandPaymentMethod } from "@/api/types";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/status-badge";

type FlatMethod = { id: string; code: string; name: string; status: string; gatewayName: string };

export function BrandPaymentMethodsSection({ brandId, mayWrite }: { brandId: string; mayWrite: boolean }) {
  const current = useQuery({ queryKey: ["admin-brand-payment-methods", brandId], queryFn: () => adminApi.listBrandPaymentMethods(brandId), retry: false });
  const gateways = useQuery({ queryKey: ["admin-payment-gateways"], queryFn: adminApi.listPaymentGateways, retry: false });
  const allMethods: FlatMethod[] = gateways.data?.flatMap((gateway) => gateway.methods.map((method) => ({ ...method, gatewayName: gateway.name }))) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Способы оплаты" description="Клиент при покупке не выбирает шлюз сам — используется способ оплаты по умолчанию этого бренда" />
      <Card>
        <CardContent>
          {current.isLoading || gateways.isLoading ? (
            <LoadingState />
          ) : current.isError || gateways.isError ? (
            <ErrorState description="Не удалось получить способы оплаты." />
          ) : allMethods.length === 0 ? (
            <EmptyState title="Способов оплаты пока нет" description="Добавьте их в разделе «Финансы → Настройки»." />
          ) : (
            <PaymentMethodsBody brandId={brandId} allMethods={allMethods} current={current.data ?? []} mayWrite={mayWrite} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentMethodsBody({ brandId, allMethods, current, mayWrite }: { brandId: string; allMethods: FlatMethod[]; current: BrandPaymentMethod[]; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(current.map((method) => method.id)));
  const [defaultId, setDefaultId] = useState<string | undefined>(() => current.find((method) => method.isDefault)?.id);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (defaultId === id) setDefaultId(undefined);
  };

  const mutation = useMutation({
    mutationFn: () => adminApi.replaceBrandPaymentMethods(brandId, { paymentMethodIds: [...selected], ...(defaultId ? { defaultPaymentMethodId: defaultId } : {}) }),
    onSuccess: async () => {
      toast.success("Способы оплаты бренда сохранены.");
      await queryClient.invalidateQueries({ queryKey: ["admin-brand-payment-methods", brandId] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Не удалось сохранить."),
  });

  const selectedMethods = allMethods.filter((method) => selected.has(method.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {allMethods.map((method) => (
          <label key={method.id} className="flex items-center gap-2 text-sm">
            <Checkbox disabled={!mayWrite} checked={selected.has(method.id)} onCheckedChange={() => toggle(method.id)} />
            <span className="flex-1">
              {method.name} ({method.gatewayName})
            </span>
            <StatusBadge status={method.status} />
          </label>
        ))}
      </div>
      {selectedMethods.length > 0 && (
        <Field>
          <FieldLabel htmlFor="brand-default-method">Способ по умолчанию</FieldLabel>
          <Select
            disabled={!mayWrite}
            items={selectedMethods.map((method) => ({ value: method.id, label: `${method.name} (${method.gatewayName})` }))}
            value={defaultId ?? null}
            onValueChange={(value) => setDefaultId(value ?? undefined)}
          >
            <SelectTrigger id="brand-default-method" className="w-full sm:w-80">
              <SelectValue placeholder="Выберите способ по умолчанию…" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Способ по умолчанию</SelectLabel>
                {selectedMethods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name} ({method.gatewayName})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      )}
      {mayWrite && (
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate()} className="self-start">
          {mutation.isPending && <Spinner />}
          Сохранить
        </Button>
      )}
    </div>
  );
}
