"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { BrandDetail, EndpointGroupListItem, PlanSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { EndpointEditDialog } from "@/features/infrastructure/endpoint-edit-dialog";
import { can } from "@/lib/access-control";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

export default function ReferencePage() {
  return (
    <AppShell>
      <PageHeader title="Справочники" description="Бренды, тарифы и серверные пакеты" />
      <BrandsCard />
      <PlansCard />
      <EndpointGroupsCard />
    </AppShell>
  );
}

function BrandsCard() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newBrand, setNewBrand] = useState({ code: "", name: "" });
  const [editingBrand, setEditingBrand] = useState<BrandDetail>();
  const [form, setForm] = useState<{ name: string; status: "ACTIVE" | "ARCHIVED"; settings: string }>({ name: "", status: "ACTIVE", settings: "{}" });
  const [formError, setFormError] = useState<string>();
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createBrand(newBrand),
    onSuccess: async () => {
      setNewBrand({ code: "", name: "" });
      setCreateOpen(false);
      toast.success("Бренд создан.");
      await queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? (error.status === 409 ? "Бренд с таким кодом уже существует." : apiErrorMessage(error)) : "Не удалось создать бренд."),
  });
  const updateMutation = useMutation({
    mutationFn: (input: { id: string; name: string; status: "ACTIVE" | "ARCHIVED"; settings: Record<string, unknown> }) =>
      adminApi.updateBrand(input.id, { name: input.name, status: input.status, settings: input.settings }),
    onSuccess: async () => {
      setEditingBrand(undefined);
      toast.success("Бренд обновлён.");
      await queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    },
    onError: () => toast.error("Не удалось обновить бренд."),
  });

  const startEdit = (brand: BrandDetail) => {
    setEditingBrand(brand);
    setForm({ name: brand.name, status: brand.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE", settings: JSON.stringify(brand.settings, null, 2) });
    setFormError(undefined);
  };

  const save = () => {
    try {
      const settings = JSON.parse(form.settings) as Record<string, unknown>;
      setFormError(undefined);
      updateMutation.mutate({ id: editingBrand!.id, name: form.name, status: form.status, settings });
    } catch {
      setFormError("Settings должны быть валидным JSON.");
    }
  };

  const columns: ColumnDef<BrandDetail>[] = [
    { id: "name", header: "Бренд", cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.code}</p>
      </div>
    ) },
    { id: "status", header: "Статус", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
    { id: "actions", header: "", cell: ({ row }) => (
      <div className="text-right">
        <Button size="sm" variant="outline" onClick={() => startEdit(row.original)}>
          Редактировать
        </Button>
      </div>
    ) },
  ];

  return (
    <Card id="brands" className="scroll-mt-(--header-height)">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Бренды</CardTitle>
          <CardDescription>Отдельные white-label сайты платформы — домены, статус и публичные настройки, которые видит клиентский сайт</CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm">Создать бренд</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать бренд</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Код бренда</Label>
                <Input placeholder="Код (a-z0-9_-)" value={newBrand.code} onChange={(event) => setNewBrand((value) => ({ ...value, code: event.target.value.toLowerCase() }))} />
              </div>
              <div className="space-y-2">
                <Label>Название бренда</Label>
                <Input placeholder="Название" value={newBrand.name} onChange={(event) => setNewBrand((value) => ({ ...value, name: event.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
              <Button disabled={!newBrand.code || !newBrand.name || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending && <Spinner />}
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={brands.data ?? []} isLoading={brands.isLoading} isError={brands.isError} errorMessage="Не удалось получить бренды." emptyMessage="Бренды не найдены." />
      </CardContent>

      <Dialog open={Boolean(editingBrand)} onOpenChange={(open) => !open && setEditingBrand(undefined)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBrand?.name}</DialogTitle>
            <DialogDescription>{editingBrand?.code}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Название бренда</Label>
              <Input value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Статус бренда</Label>
              <Select
                items={[
                  { value: "ACTIVE", label: "ACTIVE" },
                  { value: "ARCHIVED", label: "ARCHIVED" },
                ]}
                value={form.status}
                onValueChange={(value) => setForm((prev) => ({ ...prev, status: value === "ARCHIVED" ? "ARCHIVED" : "ACTIVE" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Settings JSON</Label>
              <Textarea className="min-h-32 font-mono text-xs" value={form.settings} onChange={(event) => setForm((value) => ({ ...value, settings: event.target.value }))} />
              <p className="text-xs text-muted-foreground">`settings.public` уходит клиентскому сайту как есть (публичная white-label конфигурация); `settings.hostnames` — массив доменов для определения бренда.</p>
              {formError && <p className="text-xs text-destructive">{formError}</p>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
            <Button disabled={updateMutation.isPending} onClick={save}>
              {updateMutation.isPending && <Spinner />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const billingModels = ["DEVICE_PLAN", "ACCOUNT_PLAN", "FAMILY_PLAN"] as const;

function PlansCard() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [priceEditingId, setPriceEditingId] = useState<string>();
  const [priceForm, setPriceForm] = useState<{ amount: string; currency: string }>({ amount: "", currency: "USD" });
  const [newPlan, setNewPlan] = useState({ brandId: "", code: "", name: "", billingModel: "DEVICE_PLAN" as (typeof billingModels)[number], deviceLimit: "1" });
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });
  const plans = useQuery({ queryKey: ["admin-plans-reference"], queryFn: () => adminApi.listPlans({ page: 1, pageSize: 100 }), retry: false });

  const priceMutation = useMutation({
    mutationFn: (input: { id: string; amount: number; currency: string }) => adminApi.setPlanPrice(input.id, { amount: input.amount, currency: input.currency }),
    onSuccess: async () => {
      setPriceEditingId(undefined);
      toast.success("Цена обновлена.");
      await queryClient.invalidateQueries({ queryKey: ["admin-plans-reference"] });
    },
    onError: () => toast.error("Не удалось обновить цену."),
  });
  const createMutation = useMutation({
    mutationFn: () => adminApi.createPlan({ brandId: newPlan.brandId, code: newPlan.code, name: newPlan.name, billingModel: newPlan.billingModel, deviceLimit: Number(newPlan.deviceLimit) }),
    onSuccess: async () => {
      setNewPlan({ brandId: "", code: "", name: "", billingModel: "DEVICE_PLAN", deviceLimit: "1" });
      setCreateOpen(false);
      toast.success("Тариф создан.");
      await queryClient.invalidateQueries({ queryKey: ["admin-plans-reference"] });
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
    { accessorKey: "brandCode", header: "Бренд" },
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
    { id: "actions", header: "", cell: ({ row }) => {
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
    } },
  ];

  return (
    <Card id="plans" className="scroll-mt-(--header-height)">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Тарифы</CardTitle>
          <CardDescription>Планы подписки, которые бренды предлагают клиентам — лимит устройств, модель тарификации и цена</CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm">Создать тариф</Button>} />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Создать тариф</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Бренд</Label>
                <Select
                  items={brands.data?.map((brand) => ({ value: brand.id, label: brand.name })) ?? []}
                  value={newPlan.brandId}
                  onValueChange={(value) => setNewPlan((prev) => ({ ...prev, brandId: value ?? "" }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Бренд…" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.data?.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <Button disabled={!newPlan.brandId || !newPlan.code || !newPlan.name || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending && <Spinner />}
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={plans.data?.items ?? []} isLoading={plans.isLoading} isError={plans.isError} errorMessage="Не удалось получить тарифы." emptyMessage="Тарифы не найдены." />
      </CardContent>
    </Card>
  );
}

function EndpointGroupsCard() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>();
  const [newGroup, setNewGroup] = useState({ code: "", name: "", routeClass: "" });
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayEditEndpoints = can(staff.data, "infrastructure.write");
  const groups = useQuery({ queryKey: ["admin-endpoint-groups"], queryFn: adminApi.listEndpointGroups, retry: false });
  const detail = useQuery({ queryKey: ["admin-endpoint-group", selectedId], queryFn: () => adminApi.getEndpointGroup(selectedId!), enabled: Boolean(selectedId), retry: false });
  const endpoints = useQuery({ queryKey: ["admin-infrastructure-endpoints-all"], queryFn: () => adminApi.listInfrastructureEndpoints({ page: 1, pageSize: 100 }), retry: false });
  const plans = useQuery({ queryKey: ["admin-plans-all"], queryFn: () => adminApi.listPlans({ page: 1, pageSize: 100 }), retry: false });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createEndpointGroup({ code: newGroup.code, name: newGroup.name, ...(newGroup.routeClass ? { routeClass: newGroup.routeClass } : {}) }),
    onSuccess: async () => {
      setNewGroup({ code: "", name: "", routeClass: "" });
      setCreateOpen(false);
      toast.success("Группа создана.");
      await queryClient.invalidateQueries({ queryKey: ["admin-endpoint-groups"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось создать группу."),
  });
  const membersMutation = useMutation({
    mutationFn: (endpointIds: string[]) => adminApi.replaceEndpointGroupMembers(selectedId!, { endpointIds }),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-endpoint-group", selectedId] }), queryClient.invalidateQueries({ queryKey: ["admin-endpoint-groups"] })]);
    },
    onError: () => toast.error("Не удалось обновить состав группы."),
  });
  const plansMutation = useMutation({
    mutationFn: (planIds: string[]) => adminApi.replaceEndpointGroupPlans(selectedId!, { planIds }),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-endpoint-group", selectedId] }), queryClient.invalidateQueries({ queryKey: ["admin-endpoint-groups"] })]);
    },
    onError: () => toast.error("Не удалось обновить доступ тарифов."),
  });

  const memberIds = new Set(detail.data?.endpoints.map((endpoint) => endpoint.id));
  const planIds = new Set(detail.data?.plans.map((plan) => plan.id));

  const toggleMember = (id: string) => {
    const next = new Set(memberIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    membersMutation.mutate([...next]);
  };
  const togglePlan = (id: string) => {
    const next = new Set(planIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    plansMutation.mutate([...next]);
  };

  const columns: ColumnDef<EndpointGroupListItem>[] = [
    { id: "name", header: "Пакет", cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.code} · {row.original.routeClass}
        </p>
      </div>
    ) },
    { id: "status", header: "Статус", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
    { accessorKey: "memberCount", header: "Endpoint'ов" },
    { accessorKey: "planCount", header: "Тарифов" },
  ];

  return (
    <Card id="endpoint-groups" className="scroll-mt-(--header-height)">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Серверные пакеты</CardTitle>
          <CardDescription>
            «Серверный пакет» — это набор серверов (endpoint&#39;ов), которые вместе выдаются клиенту в рамках одного тарифа. Например, пакет «Европа Стандарт» может включать сервера в
            Нидерландах, Франции и Германии. Один сервер может входить сразу в несколько пакетов.
          </CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm">Создать пакет</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать серверный пакет</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Код пакета</Label>
                <Input placeholder="Код (A-Z0-9_)" value={newGroup.code} onChange={(event) => setNewGroup((value) => ({ ...value, code: event.target.value.toUpperCase() }))} />
              </div>
              <div className="space-y-2">
                <Label>Название пакета</Label>
                <Input placeholder="Название" value={newGroup.name} onChange={(event) => setNewGroup((value) => ({ ...value, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Класс маршрутизации</Label>
                <Input placeholder="Класс маршрутизации (опционально)" value={newGroup.routeClass} onChange={(event) => setNewGroup((value) => ({ ...value, routeClass: event.target.value.toUpperCase() }))} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
              <Button disabled={!newGroup.code || !newGroup.name || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending && <Spinner />}
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={groups.data?.items ?? []}
          isLoading={groups.isLoading}
          isError={groups.isError}
          errorMessage="Не удалось получить группы."
          emptyMessage="Группы не найдены."
          onRowClick={(group) => setSelectedId(group.id)}
          isRowActive={(group) => group.id === selectedId}
        />
      </CardContent>

      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(undefined)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail.isLoading ? (
            <div className="space-y-3 pt-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : detail.isError ? (
            <p className="pt-6 text-sm text-destructive">Не удалось получить карточку пакета.</p>
          ) : detail.data ? (
            <>
              <SheetHeader>
                <SheetTitle>{detail.data.name}</SheetTitle>
                <SheetDescription>
                  {detail.data.code} · {detail.data.routeClass}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-6">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Серверы в пакете — клик по названию открывает редактирование</p>
                  <ScrollArea className="h-64 rounded-md border p-3">
                    <div className="space-y-2">
                      {endpoints.data?.items.map((endpoint) => (
                        <div key={endpoint.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`member-${endpoint.id}`}
                            checked={memberIds.has(endpoint.id)}
                            disabled={membersMutation.isPending}
                            onCheckedChange={() => toggleMember(endpoint.id)}
                          />
                          <button type="button" className="flex-1 truncate text-left text-sm hover:underline" onClick={() => setSelectedEndpointId(endpoint.id)}>
                            {endpoint.name} ({endpoint.countryCode}, {endpoint.protocol})
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Тарифы, получающие доступ через эту группу</p>
                  <ScrollArea className="h-64 rounded-md border p-3">
                    <div className="space-y-2">
                      {plans.data?.items.map((plan) => (
                        <Label key={plan.id} className="flex items-center gap-2 font-normal">
                          <Checkbox checked={planIds.has(plan.id)} disabled={plansMutation.isPending} onCheckedChange={() => togglePlan(plan.id)} />
                          {plan.name} ({plan.brandCode})
                        </Label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <EndpointEditDialog
        endpoint={endpoints.data?.items.find((endpoint) => endpoint.id === selectedEndpointId)}
        onOpenChange={(open) => !open && setSelectedEndpointId(undefined)}
        mayWrite={mayEditEndpoints}
      />
    </Card>
  );
}
