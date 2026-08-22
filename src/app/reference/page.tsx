"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi, ApiError } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const selectClassName = "h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const textareaClassName = "w-full min-h-24 rounded-md border bg-background p-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

export default function ReferencePage() {
  return <AppShell>
    <PageHeader title="Справочники" description="Бренды, тарифы и группы endpoint'ов" />
    <div className="space-y-4">
      <BrandsCard />
      <PlansCard />
      <EndpointGroupsCard />
    </div>
  </AppShell>;
}

function BrandsCard() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string>();
  const [form, setForm] = useState<{ name: string; status: "ACTIVE" | "ARCHIVED"; settings: string }>({ name: "", status: "ACTIVE", settings: "{}" });
  const [formError, setFormError] = useState<string>();
  const [newBrand, setNewBrand] = useState({ code: "", name: "" });
  const [createError, setCreateError] = useState<string>();
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });
  const mutation = useMutation({
    mutationFn: (input: { id: string; name: string; status: "ACTIVE" | "ARCHIVED"; settings: Record<string, unknown> }) =>
      adminApi.updateBrand(input.id, { name: input.name, status: input.status, settings: input.settings }),
    onSuccess: async () => { setEditingId(undefined); await queryClient.invalidateQueries({ queryKey: ["admin-brands"] }); },
  });
  const createMutation = useMutation({
    mutationFn: () => adminApi.createBrand(newBrand),
    onSuccess: async () => { setNewBrand({ code: "", name: "" }); setCreateError(undefined); await queryClient.invalidateQueries({ queryKey: ["admin-brands"] }); },
    onError: (error) => setCreateError(error instanceof ApiError ? (error.status === 409 ? "Бренд с таким кодом уже существует." : apiErrorMessage(error)) : "Не удалось создать бренд."),
  });

  const startEdit = (brand: NonNullable<typeof brands.data>[number]) => {
    setEditingId(brand.id);
    setForm({ name: brand.name, status: brand.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE", settings: JSON.stringify(brand.settings, null, 2) });
    setFormError(undefined);
  };

  const save = () => {
    try {
      const settings = JSON.parse(form.settings) as Record<string, unknown>;
      setFormError(undefined);
      mutation.mutate({ id: editingId!, name: form.name, status: form.status, settings });
    } catch {
      setFormError("Settings должны быть валидным JSON.");
    }
  };

  return <Card><CardHeader><CardTitle>Бренды</CardTitle><CardDescription>Отдельные white-label сайты платформы — домены, статус и публичные настройки, которые видит клиентский сайт</CardDescription></CardHeader><CardContent>
    <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <Input aria-label="Код бренда" placeholder="Код (a-z0-9_-)" value={newBrand.code} onChange={(event) => setNewBrand((value) => ({ ...value, code: event.target.value.toLowerCase() }))} />
      <Input aria-label="Название бренда" placeholder="Название" value={newBrand.name} onChange={(event) => setNewBrand((value) => ({ ...value, name: event.target.value }))} />
      <Button disabled={!newBrand.code || !newBrand.name || createMutation.isPending} onClick={() => createMutation.mutate()}>Создать бренд</Button>
    </div>
    {createError && <p className="mb-3 text-xs text-red-600 dark:text-red-400">{createError}</p>}
    {brands.isLoading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : brands.isError ? <p className="text-sm text-red-600 dark:text-red-400">Не удалось получить бренды.</p> : <div className="space-y-3">
      {brands.data?.map((brand) => <div className="rounded-lg border p-3" key={brand.id}>
        <div className="flex items-center justify-between"><div><p className="font-medium">{brand.name}</p><p className="text-xs text-muted-foreground">{brand.code}</p></div><div className="flex items-center gap-2"><Badge>{brand.status}</Badge>{editingId !== brand.id && <Button size="sm" variant="outline" onClick={() => startEdit(brand)}>Редактировать</Button>}</div></div>
        {editingId === brand.id && <div className="mt-3 space-y-2">
          <Input aria-label="Название бренда" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} />
          <select aria-label="Статус бренда" className={selectClassName} value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value === "ARCHIVED" ? "ARCHIVED" : "ACTIVE" }))}><option value="ACTIVE">ACTIVE</option><option value="ARCHIVED">ARCHIVED</option></select>
          <textarea aria-label="Settings JSON" className={textareaClassName} value={form.settings} onChange={(event) => setForm((value) => ({ ...value, settings: event.target.value }))} />
          <p className="text-xs text-muted-foreground">`settings.public` уходит клиентскому сайту как есть (публичная white-label конфигурация); `settings.hostnames` — массив доменов для определения бренда.</p>
          {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}
          <div className="flex gap-2"><Button size="sm" disabled={mutation.isPending} onClick={save}>Сохранить</Button><Button size="sm" variant="outline" onClick={() => setEditingId(undefined)}>Отмена</Button></div>
        </div>}
      </div>)}
    </div>}
  </CardContent></Card>;
}

const billingModels = ["DEVICE_PLAN", "ACCOUNT_PLAN", "FAMILY_PLAN"] as const;

function PlansCard() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string>();
  const [priceForm, setPriceForm] = useState<{ amount: string; currency: string }>({ amount: "", currency: "USD" });
  const [newPlan, setNewPlan] = useState({ brandId: "", code: "", name: "", billingModel: "DEVICE_PLAN" as (typeof billingModels)[number], deviceLimit: "1" });
  const [createError, setCreateError] = useState<string>();
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });
  const plans = useQuery({ queryKey: ["admin-plans-reference"], queryFn: () => adminApi.listPlans({ page: 1, pageSize: 100 }), retry: false });
  const mutation = useMutation({
    mutationFn: (input: { id: string; amount: number; currency: string }) => adminApi.setPlanPrice(input.id, { amount: input.amount, currency: input.currency }),
    onSuccess: async () => { setEditingId(undefined); await queryClient.invalidateQueries({ queryKey: ["admin-plans-reference"] }); },
  });
  const createMutation = useMutation({
    mutationFn: () => adminApi.createPlan({ brandId: newPlan.brandId, code: newPlan.code, name: newPlan.name, billingModel: newPlan.billingModel, deviceLimit: Number(newPlan.deviceLimit) }),
    onSuccess: async () => { setNewPlan({ brandId: "", code: "", name: "", billingModel: "DEVICE_PLAN", deviceLimit: "1" }); setCreateError(undefined); await queryClient.invalidateQueries({ queryKey: ["admin-plans-reference"] }); },
    onError: (error) => setCreateError(error instanceof ApiError ? (error.status === 409 ? "Тариф с таким кодом уже существует у этого бренда." : apiErrorMessage(error)) : "Не удалось создать тариф."),
  });

  return <Card><CardHeader><CardTitle>Тарифы</CardTitle><CardDescription>Планы подписки, которые бренды предлагают клиентам — лимит устройств, модель тарификации и цена</CardDescription></CardHeader><CardContent className="overflow-x-auto">
    <div className="mb-4 grid gap-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
      <select aria-label="Бренд" className={selectClassName} value={newPlan.brandId} onChange={(event) => setNewPlan((value) => ({ ...value, brandId: event.target.value }))}>
        <option value="">Бренд…</option>
        {brands.data?.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
      </select>
      <Input aria-label="Код тарифа" placeholder="Код (A-Z0-9_)" value={newPlan.code} onChange={(event) => setNewPlan((value) => ({ ...value, code: event.target.value.toUpperCase() }))} />
      <Input aria-label="Название тарифа" placeholder="Название" value={newPlan.name} onChange={(event) => setNewPlan((value) => ({ ...value, name: event.target.value }))} />
      <select aria-label="Модель тарификации" className={selectClassName} value={newPlan.billingModel} onChange={(event) => setNewPlan((value) => ({ ...value, billingModel: event.target.value as (typeof billingModels)[number] }))}>
        {billingModels.map((model) => <option key={model} value={model}>{model}</option>)}
      </select>
      <Input aria-label="Лимит устройств" type="number" min={1} className="w-24" value={newPlan.deviceLimit} onChange={(event) => setNewPlan((value) => ({ ...value, deviceLimit: event.target.value }))} />
      <Button disabled={!newPlan.brandId || !newPlan.code || !newPlan.name || createMutation.isPending} onClick={() => createMutation.mutate()}>Создать тариф</Button>
    </div>
    {createError && <p className="mb-3 text-xs text-red-600 dark:text-red-400">{createError}</p>}
    {plans.isLoading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : plans.isError ? <p className="text-sm text-red-600 dark:text-red-400">Не удалось получить тарифы.</p> : <table className="w-full min-w-3xl text-sm"><thead><tr className="border-b text-left"><th className="p-3">Тариф</th><th className="p-3">Бренд</th><th className="p-3">Модель</th><th className="p-3">Устройств</th><th className="p-3">Цена</th><th /></tr></thead><tbody>{plans.data?.items.map((plan) => <tr className="border-b last:border-0" key={plan.id}><td className="p-3"><p className="font-medium">{plan.name}</p><p className="text-xs text-muted-foreground">{plan.code}</p></td><td className="p-3">{plan.brandCode}</td><td className="p-3">{plan.billingModel}</td><td className="p-3">{plan.deviceLimit}</td><td className="p-3">{editingId === plan.id ? <div className="flex gap-1"><Input aria-label="Сумма" className="w-20" value={priceForm.amount} onChange={(event) => setPriceForm((value) => ({ ...value, amount: event.target.value }))} /><Input aria-label="Валюта" className="w-16" value={priceForm.currency} onChange={(event) => setPriceForm((value) => ({ ...value, currency: event.target.value }))} /></div> : plan.price ? `${plan.price.amount} ${plan.price.currency}` : "—"}</td><td className="p-3 text-right">{editingId === plan.id ? <div className="flex justify-end gap-2"><Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: plan.id, amount: Number(priceForm.amount), currency: priceForm.currency })}>Сохранить</Button><Button size="sm" variant="outline" onClick={() => setEditingId(undefined)}>Отмена</Button></div> : <Button size="sm" variant="outline" onClick={() => { setEditingId(plan.id); setPriceForm({ amount: plan.price ? String(plan.price.amount) : "", currency: plan.price?.currency ?? "USD" }); }}>Задать цену</Button>}</td></tr>)}</tbody></table>}
  </CardContent></Card>;
}

function EndpointGroupsCard() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>();
  const [newGroup, setNewGroup] = useState({ code: "", name: "", routeClass: "" });
  const groups = useQuery({ queryKey: ["admin-endpoint-groups"], queryFn: adminApi.listEndpointGroups, retry: false });
  const detail = useQuery({ queryKey: ["admin-endpoint-group", selectedId], queryFn: () => adminApi.getEndpointGroup(selectedId!), enabled: Boolean(selectedId), retry: false });
  const endpoints = useQuery({ queryKey: ["admin-infrastructure-endpoints-all"], queryFn: () => adminApi.listInfrastructureEndpoints({ page: 1, pageSize: 100 }), retry: false });
  const plans = useQuery({ queryKey: ["admin-plans-all"], queryFn: () => adminApi.listPlans({ page: 1, pageSize: 100 }), retry: false });

  const [createError, setCreateError] = useState<string>();
  const createMutation = useMutation({
    mutationFn: () => adminApi.createEndpointGroup({ code: newGroup.code, name: newGroup.name, ...(newGroup.routeClass ? { routeClass: newGroup.routeClass } : {}) }),
    onSuccess: async () => { setNewGroup({ code: "", name: "", routeClass: "" }); setCreateError(undefined); await queryClient.invalidateQueries({ queryKey: ["admin-endpoint-groups"] }); },
    onError: (error) => setCreateError(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось создать группу."),
  });
  const membersMutation = useMutation({
    mutationFn: (endpointIds: string[]) => adminApi.replaceEndpointGroupMembers(selectedId!, { endpointIds }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-endpoint-group", selectedId] }), queryClient.invalidateQueries({ queryKey: ["admin-endpoint-groups"] })]); },
  });
  const plansMutation = useMutation({
    mutationFn: (planIds: string[]) => adminApi.replaceEndpointGroupPlans(selectedId!, { planIds }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-endpoint-group", selectedId] }), queryClient.invalidateQueries({ queryKey: ["admin-endpoint-groups"] })]); },
  });

  const memberIds = new Set(detail.data?.endpoints.map((endpoint) => endpoint.id));
  const planIds = new Set(detail.data?.plans.map((plan) => plan.id));

  const toggleMember = (id: string) => {
    const next = new Set(memberIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    membersMutation.mutate([...next]);
  };
  const togglePlan = (id: string) => {
    const next = new Set(planIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    plansMutation.mutate([...next]);
  };

  return <Card><CardHeader><CardTitle>Группы endpoint&#39;ов</CardTitle><CardDescription>Наборы серверов, объединённые для выдачи доступа — каждой группе назначаются тарифы, которые её получают</CardDescription></CardHeader><CardContent>
    <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <Input aria-label="Код группы" placeholder="Код (A-Z0-9_)" value={newGroup.code} onChange={(event) => setNewGroup((value) => ({ ...value, code: event.target.value.toUpperCase() }))} />
      <Input aria-label="Название группы" placeholder="Название" value={newGroup.name} onChange={(event) => setNewGroup((value) => ({ ...value, name: event.target.value }))} />
      <Input aria-label="Класс маршрутизации" placeholder="Класс маршрутизации (опционально)" value={newGroup.routeClass} onChange={(event) => setNewGroup((value) => ({ ...value, routeClass: event.target.value.toUpperCase() }))} />
      <Button disabled={!newGroup.code || !newGroup.name || createMutation.isPending} onClick={() => createMutation.mutate()}>Создать</Button>
    </div>
    {createError && <p className="mb-3 text-xs text-red-600 dark:text-red-400">{createError}</p>}
    <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
      <div className="space-y-2">
        {groups.isLoading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : groups.isError ? <p className="text-sm text-red-600 dark:text-red-400">Не удалось получить группы.</p> : groups.data?.items.map((group) => <button key={group.id} onClick={() => setSelectedId(group.id)} className={`w-full rounded-lg border p-3 text-left ${selectedId === group.id ? "border-primary" : ""}`}>
          <div className="flex items-center justify-between"><p className="font-medium">{group.name}</p><Badge>{group.status}</Badge></div>
          <p className="text-xs text-muted-foreground">{group.code} · {group.routeClass}</p>
        </button>)}
      </div>
      <div>
        {!selectedId ? <p className="text-sm text-muted-foreground">Выберите группу.</p> : detail.isLoading ? <p>Загрузка…</p> : detail.isError ? <p className="text-red-600 dark:text-red-400">Не удалось получить карточку группы.</p> : detail.data && <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Endpoint&#39;ы в группе</p>
            <div className="max-h-64 space-y-1 overflow-y-auto">{endpoints.data?.items.map((endpoint) => <label className="flex items-center gap-2 text-sm" key={endpoint.id}><input type="checkbox" checked={memberIds.has(endpoint.id)} disabled={membersMutation.isPending} onChange={() => toggleMember(endpoint.id)} />{endpoint.name} ({endpoint.countryCode}, {endpoint.protocol})</label>)}</div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Тарифы, получающие доступ через эту группу</p>
            <div className="max-h-64 space-y-1 overflow-y-auto">{plans.data?.items.map((plan) => <label className="flex items-center gap-2 text-sm" key={plan.id}><input type="checkbox" checked={planIds.has(plan.id)} disabled={plansMutation.isPending} onChange={() => togglePlan(plan.id)} />{plan.name} ({plan.brandCode})</label>)}</div>
          </div>
        </div>}
      </div>
    </div>
  </CardContent></Card>;
}
