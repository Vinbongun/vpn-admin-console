"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { BrandDetail, PlanSummary } from "@/api/types";
import { DataTable } from "@/components/data-table";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

const billingModels = ["DEVICE_PLAN", "ACCOUNT_PLAN", "FAMILY_PLAN"] as const;
const serviceLines = ["MAIN", "WHITELIST"] as const;

export function BrandPlansSection({ brand, mayWrite }: { brand: BrandDetail; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [priceEditingId, setPriceEditingId] = useState<string>();
  const [priceForm, setPriceForm] = useState<{ amount: string }>({ amount: "" });
  const [newPlan, setNewPlan] = useState({ code: "", name: "", billingModel: "DEVICE_PLAN" as (typeof billingModels)[number], deviceLimit: "1", serviceLine: "MAIN" as (typeof serviceLines)[number], isTrial: false });
  const [editingPlan, setEditingPlan] = useState<PlanSummary>();
  const [editForm, setEditForm] = useState({ name: "", billingModel: "DEVICE_PLAN" as (typeof billingModels)[number], deviceLimit: "1", status: "ACTIVE" as "ACTIVE" | "INACTIVE", serviceLine: "MAIN" as (typeof serviceLines)[number], isTrial: false });
  const plans = useQuery({ queryKey: ["admin-brand-plans", brand.id], queryFn: () => adminApi.listPlans({ brandCode: brand.code, pageSize: 100 }), retry: false });

  const priceMutation = useMutation({
    mutationFn: (input: { id: string; amount: number }) => adminApi.setPlanPrice(input.id, { amount: input.amount }),
    onSuccess: async () => {
      setPriceEditingId(undefined);
      toast.success("Цена обновлена.");
      await queryClient.invalidateQueries({ queryKey: ["admin-brand-plans", brand.id] });
    },
    onError: () => toast.error("Не удалось обновить цену."),
  });
  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createPlan({
        brandId: brand.id,
        code: newPlan.code,
        name: newPlan.name,
        billingModel: newPlan.billingModel,
        deviceLimit: Number(newPlan.deviceLimit),
        serviceLine: newPlan.serviceLine,
        isTrial: newPlan.isTrial,
      }),
    onSuccess: async () => {
      setNewPlan({ code: "", name: "", billingModel: "DEVICE_PLAN", deviceLimit: "1", serviceLine: "MAIN", isTrial: false });
      setCreateOpen(false);
      toast.success("Тариф создан.");
      await queryClient.invalidateQueries({ queryKey: ["admin-brand-plans", brand.id] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? (error.status === 409 ? "Тариф с таким кодом уже существует у этого бренда." : apiErrorMessage(error)) : "Не удалось создать тариф."),
  });
  const updateMutation = useMutation({
    mutationFn: (input: {
      id: string;
      body: { name: string; billingModel: (typeof billingModels)[number]; deviceLimit: number; status: "ACTIVE" | "INACTIVE"; serviceLine: (typeof serviceLines)[number]; isTrial: boolean };
    }) => adminApi.updatePlan(input.id, input.body),
    onSuccess: async () => {
      setEditingPlan(undefined);
      toast.success("Тариф обновлён.");
      await queryClient.invalidateQueries({ queryKey: ["admin-brand-plans", brand.id] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось обновить тариф."),
  });

  const startPriceEdit = (plan: PlanSummary) => {
    setPriceEditingId(plan.id);
    setPriceForm({ amount: plan.price ? String(plan.price.amount) : "" });
  };
  const startEdit = (plan: PlanSummary) => {
    setEditingPlan(plan);
    setEditForm({
      name: plan.name,
      billingModel: plan.billingModel,
      deviceLimit: String(plan.deviceLimit),
      status: plan.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      serviceLine: plan.serviceLine,
      isTrial: plan.isTrial,
    });
  };

  const columns: ColumnDef<PlanSummary>[] = [
    { id: "name", header: "Тариф", cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.code}</p>
      </div>
    ) },
    { accessorKey: "billingModel", header: "Модель" },
    { accessorKey: "serviceLine", header: "Линейка" },
    { id: "isTrial", header: "Триал", cell: ({ row }) => (row.original.isTrial ? <Badge variant="outline">Триал</Badge> : "—") },
    { accessorKey: "deviceLimit", header: "Устройств" },
    { accessorKey: "status", header: "Статус" },
    { id: "price", header: "Цена", cell: ({ row }) => {
      const plan = row.original;
      if (priceEditingId === plan.id) {
        return (
          <Input aria-label="Сумма, ₽" className="w-24" value={priceForm.amount} onChange={(event) => setPriceForm({ amount: event.target.value })} />
        );
      }
      return plan.price ? `${plan.price.amount} ₽` : "—";
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
                  <Button size="sm" disabled={priceMutation.isPending} onClick={() => priceMutation.mutate({ id: plan.id, amount: Number(priceForm.amount) })}>
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
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(plan)}>
                  Редактировать
                </Button>
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
                        <SelectGroup>
                          <SelectLabel>Модель тарификации</SelectLabel>
                          {billingModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Лимит устройств</Label>
                    <Input type="number" min={1} value={newPlan.deviceLimit} onChange={(event) => setNewPlan((value) => ({ ...value, deviceLimit: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Линейка услуг</Label>
                    <Select
                      items={serviceLines.map((value) => ({ value, label: value }))}
                      value={newPlan.serviceLine}
                      onValueChange={(value) => setNewPlan((prev) => ({ ...prev, serviceLine: value as (typeof serviceLines)[number] }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Линейка услуг</SelectLabel>
                          {serviceLines.map((line) => (
                            <SelectItem key={line} value={line}>
                              {line}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label className="flex items-start gap-2">
                      <Checkbox checked={newPlan.isTrial} onCheckedChange={(checked) => setNewPlan((value) => ({ ...value, isTrial: checked === true }))} className="mt-0.5" />
                      <span className="text-sm">Триальный тариф бренда</span>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      У бренда может быть только один активный триальный тариф — он используется для самостоятельного запуска триала клиентом.
                    </p>
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

      <Dialog open={Boolean(editingPlan)} onOpenChange={(open) => !open && setEditingPlan(undefined)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактировать тариф</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Код тарифа</Label>
              <Input disabled value={editingPlan?.code ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Название тарифа</Label>
              <Input placeholder="Название" value={editForm.name} onChange={(event) => setEditForm((value) => ({ ...value, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Лимит устройств</Label>
              <Input type="number" min={1} value={editForm.deviceLimit} onChange={(event) => setEditForm((value) => ({ ...value, deviceLimit: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Модель тарификации</Label>
              <Select
                items={billingModels.map((value) => ({ value, label: value }))}
                value={editForm.billingModel}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, billingModel: value as (typeof billingModels)[number] }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Модель тарификации</SelectLabel>
                    {billingModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Линейка услуг</Label>
              <Select
                items={serviceLines.map((value) => ({ value, label: value }))}
                value={editForm.serviceLine}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, serviceLine: value as (typeof serviceLines)[number] }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Линейка услуг</SelectLabel>
                    {serviceLines.map((line) => (
                      <SelectItem key={line} value={line}>
                        {line}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select
                items={[
                  { value: "ACTIVE", label: "ACTIVE" },
                  { value: "INACTIVE", label: "INACTIVE" },
                ]}
                value={editForm.status}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value as "ACTIVE" | "INACTIVE" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Статус</SelectLabel>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="flex items-start gap-2">
                <Checkbox checked={editForm.isTrial} onCheckedChange={(checked) => setEditForm((value) => ({ ...value, isTrial: checked === true }))} className="mt-0.5" />
                <span className="text-sm">Триальный тариф бренда</span>
              </label>
              <p className="text-xs text-muted-foreground">
                У бренда может быть только один активный триальный тариф — он используется для самостоятельного запуска триала клиентом.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
            <Button
              disabled={!editForm.name || updateMutation.isPending}
              onClick={() =>
                editingPlan &&
                updateMutation.mutate({
                  id: editingPlan.id,
                  body: {
                    name: editForm.name,
                    billingModel: editForm.billingModel,
                    deviceLimit: Number(editForm.deviceLimit),
                    status: editForm.status,
                    serviceLine: editForm.serviceLine,
                    isTrial: editForm.isTrial,
                  },
                })
              }
            >
              {updateMutation.isPending && <Spinner />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
