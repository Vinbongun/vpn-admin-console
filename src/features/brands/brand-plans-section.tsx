"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { BrandDetail, PlanSummary } from "@/api/types";
import { DataTable } from "@/components/data-table";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

const billingModels = ["DEVICE_PLAN", "ACCOUNT_PLAN", "FAMILY_PLAN"] as const;

export function BrandPlansSection({ brand, mayWrite }: { brand: BrandDetail; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [priceEditingId, setPriceEditingId] = useState<string>();
  const [priceForm, setPriceForm] = useState<{ amount: string; currency: string }>({ amount: "", currency: "USD" });
  const [newPlan, setNewPlan] = useState({ code: "", name: "", billingModel: "DEVICE_PLAN" as (typeof billingModels)[number], deviceLimit: "1" });
  const plans = useQuery({ queryKey: ["admin-brand-plans", brand.id], queryFn: () => adminApi.listPlans({ brandCode: brand.code, pageSize: 100 }), retry: false });

  const priceMutation = useMutation({
    mutationFn: (input: { id: string; amount: number; currency: string }) => adminApi.setPlanPrice(input.id, { amount: input.amount, currency: input.currency }),
    onSuccess: async () => {
      setPriceEditingId(undefined);
      toast.success("Цена обновлена.");
      await queryClient.invalidateQueries({ queryKey: ["admin-brand-plans", brand.id] });
    },
    onError: () => toast.error("Не удалось обновить цену."),
  });
  const createMutation = useMutation({
    mutationFn: () => adminApi.createPlan({ brandId: brand.id, code: newPlan.code, name: newPlan.name, billingModel: newPlan.billingModel, deviceLimit: Number(newPlan.deviceLimit) }),
    onSuccess: async () => {
      setNewPlan({ code: "", name: "", billingModel: "DEVICE_PLAN", deviceLimit: "1" });
      setCreateOpen(false);
      toast.success("Тариф создан.");
      await queryClient.invalidateQueries({ queryKey: ["admin-brand-plans", brand.id] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? (error.status === 409 ? "Тариф с таким кодом уже существует у этого бренда." : apiErrorMessage(error)) : "Не удалось создать тариф."),
  });

  const startPriceEdit = (plan: PlanSummary) => {
    setPriceEditingId(plan.id);
    setPriceForm({ amount: plan.price ? String(plan.price.amount) : "", currency: plan.price?.currency ?? "USD" });
  };

  const columns: ColumnDef<PlanSummary>[] = [
    { id: "name", header: "Тариф", cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.code}</p>
      </div>
    ) },
    { accessorKey: "billingModel", header: "Модель" },
    { accessorKey: "deviceLimit", header: "Устройств" },
    { id: "price", header: "Цена", cell: ({ row }) => {
      const plan = row.original;
      if (priceEditingId === plan.id) {
        return (
          <div className="flex gap-1">
            <Input aria-label="Сумма" className="w-20" value={priceForm.amount} onChange={(event) => setPriceForm((value) => ({ ...value, amount: event.target.value }))} />
            <Input aria-label="Валюта" className="w-16" value={priceForm.currency} onChange={(event) => setPriceForm((value) => ({ ...value, currency: event.target.value }))} />
          </div>
        );
      }
      return plan.price ? `${plan.price.amount} ${plan.price.currency}` : "—";
    } },
    ...(mayWrite
      ? [{
          id: "actions",
          header: "",
          cell: ({ row }: { row: { original: PlanSummary } }) => {
            const plan = row.original;
            if (priceEditingId === plan.id) {
              return (
                <div className="flex justify-end gap-2">
                  <Button size="sm" disabled={priceMutation.isPending} onClick={() => priceMutation.mutate({ id: plan.id, amount: Number(priceForm.amount), currency: priceForm.currency })}>
                    {priceMutation.isPending && <Spinner />}
                    Сохранить
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPriceEditingId(undefined)}>
                    Отмена
                  </Button>
                </div>
              );
            }
            return (
              <div className="text-right">
                <Button size="sm" variant="outline" onClick={() => startPriceEdit(plan)}>
                  Задать цену
                </Button>
              </div>
            );
          },
        } satisfies ColumnDef<PlanSummary>]
      : []),
  ];

  return (
    <div id="plans" className="scroll-mt-(--header-height) flex flex-col gap-4">
      <SectionHeader
        title="Тарифы"
        description="Планы подписки, которые этот бренд предлагает клиентам — лимит устройств, модель тарификации и цена"
        actions={
          mayWrite && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger render={<Button size="sm">Создать тариф</Button>} />
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Создать тариф</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Код тарифа</Label>
                    <Input placeholder="Код (A-Z0-9_)" value={newPlan.code} onChange={(event) => setNewPlan((value) => ({ ...value, code: event.target.value.toUpperCase() }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Название тарифа</Label>
                    <Input placeholder="Название" value={newPlan.name} onChange={(event) => setNewPlan((value) => ({ ...value, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Модель тарификации</Label>
                    <Select
                      items={billingModels.map((value) => ({ value, label: value }))}
                      value={newPlan.billingModel}
                      onValueChange={(value) => setNewPlan((prev) => ({ ...prev, billingModel: value as (typeof billingModels)[number] }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {billingModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Лимит устройств</Label>
                    <Input type="number" min={1} value={newPlan.deviceLimit} onChange={(event) => setNewPlan((value) => ({ ...value, deviceLimit: event.target.value }))} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
                  <Button disabled={!newPlan.code || !newPlan.name || createMutation.isPending} onClick={() => createMutation.mutate()}>
                    {createMutation.isPending && <Spinner />}
                    Создать
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />
      <Card>
        <CardContent>
          <DataTable columns={columns} data={plans.data?.items ?? []} isLoading={plans.isLoading} isError={plans.isError} errorMessage="Не удалось получить тарифы." emptyMessage="Тарифы не найдены." />
        </CardContent>
      </Card>
    </div>
  );
}
