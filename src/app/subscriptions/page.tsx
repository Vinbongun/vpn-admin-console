"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminApi } from "@/api/client";
import type { CreateSubscription, IssuedSubscriptionToken, SubscriptionSummary, UpdateSubscription } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { can } from "@/lib/access-control";

const schema = z.object({
  brandMembershipId: z.uuid(),
  planId: z.union([z.uuid(), z.literal("")]),
  status: z.enum(["PENDING", "TRIAL", "ACTIVE"]),
  startsAt: z.string().min(1),
  expiresAt: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;
type Status = SubscriptionSummary["status"];

const subscriptionStatuses = ["PENDING", "TRIAL", "ACTIVE", "PAST_DUE", "EXPIRED", "SUSPENDED", "REVOKED"] as const;
const selectClassName = "h-10 rounded-lg border bg-background px-3 text-sm";

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [brandCode, setBrandCode] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [editStatus, setEditStatus] = useState<Status>("ACTIVE");
  const planSelectRef = useRef<HTMLSelectElement>(null);
  const [reason, setReason] = useState("");
  const [issuedToken, setIssuedToken] = useState<IssuedSubscriptionToken>();

  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });
  const subscriptions = useQuery({ queryKey: ["admin-subscriptions", page, brandCode, customerEmail, status], queryFn: () => adminApi.listSubscriptions({ page, pageSize: 25, sortBy: "createdAt", sortOrder: "desc", ...(brandCode ? { brandCode } : {}), ...(customerEmail ? { customerEmail } : {}), ...(status ? { status } : {}) }), retry: false });
  const detail = useQuery({ queryKey: ["admin-subscription", selectedId], queryFn: () => adminApi.getSubscription(selectedId!), enabled: Boolean(selectedId), retry: false });
  const customers = useQuery({ queryKey: ["admin-customers", "subscription-form"], queryFn: () => adminApi.listCustomers({ page: 1, pageSize: 100 }), retry: false });
  const plans = useQuery({ queryKey: ["admin-plans", "subscription-form"], queryFn: () => adminApi.listPlans({ page: 1, pageSize: 100, status: "ACTIVE" }), retry: false });
  const mayWrite = can(staff.data, "subscriptions.write");
  const totalPages = Math.max(1, Math.ceil((subscriptions.data?.total ?? 0) / (subscriptions.data?.pageSize ?? 25)));

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { brandMembershipId: "", planId: "", status: "ACTIVE", startsAt: "", expiresAt: "" } });
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] }), queryClient.invalidateQueries({ queryKey: ["admin-subscription", selectedId] })]);
  const createMutation = useMutation({ mutationFn: adminApi.createSubscription, onSuccess: async () => { form.reset(); await refresh(); } });
  const updateMutation = useMutation({ mutationFn: ({ id, body }: { id: string; body: UpdateSubscription }) => adminApi.updateSubscription(id, body), onSuccess: refresh });
  const revokeMutation = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.revokeSubscription(id, reason), onSuccess: refresh });
  const rotateMutation = useMutation({ mutationFn: (id: string) => adminApi.rotateSubscriptionToken(id), onSuccess: setIssuedToken });

  const submit = form.handleSubmit((values) => {
    const payload: CreateSubscription = { brandMembershipId: values.brandMembershipId, ...(values.planId ? { planId: values.planId } : {}), status: values.status, startsAt: new Date(values.startsAt).toISOString(), expiresAt: new Date(values.expiresAt).toISOString() };
    createMutation.mutate(payload);
  });

  return <AppShell><PageHeader title="Подписки" description="Управление подписками клиентов" />
    {issuedToken && <Card className="mb-4 border-amber-500/50"><CardHeader><CardTitle>Новый токен — сохраните сейчас</CardTitle><CardDescription>Токен в открытом виде возвращается сервером только один раз и не сохраняется интерфейсом.</CardDescription></CardHeader><CardContent><code className="block break-all rounded-lg bg-muted p-3 text-sm">{issuedToken.token}</code><Button className="mt-3" variant="outline" onClick={() => setIssuedToken(undefined)}>Скрыть</Button></CardContent></Card>}
    <Card className="mb-4"><CardHeader><CardTitle>Фильтры</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">
      <select aria-label="Бренд" className={selectClassName} value={brandCode} onChange={(event) => { setBrandCode(event.target.value); setPage(1); }}>
        <option value="">Все бренды</option>
        {brands.data?.map((brand) => <option key={brand.id} value={brand.code}>{brand.name}</option>)}
      </select>
      <Input placeholder="Email клиента" value={customerEmail} onChange={(event) => { setCustomerEmail(event.target.value); setPage(1); }} />
      <select aria-label="Статус" className={selectClassName} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
        <option value="">Все статусы</option>
        {subscriptionStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    </CardContent></Card>
    {mayWrite && <Card className="mb-4"><CardHeader><CardTitle>Создать подписку</CardTitle><CardDescription>Бренд клиента и тариф выбираются из уже существующих записей.</CardDescription></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={submit}><select aria-label="Привязка к бренду" className={selectClassName} {...form.register("brandMembershipId")}><option value="">Выберите привязку к бренду</option>{customers.data?.items.flatMap((customer) => customer.memberships.map((membership) => <option key={membership.id} value={membership.id}>{customer.email} · {membership.brandCode}</option>))}</select><select aria-label="Тариф" className={selectClassName} {...form.register("planId")}><option value="">Без тарифа</option>{plans.data?.items.map((plan) => <option key={plan.id} value={plan.id}>{plan.brandCode} · {plan.name}</option>)}</select><select aria-label="Статус подписки" className={selectClassName} {...form.register("status")}><option value="PENDING">PENDING</option><option value="TRIAL">TRIAL</option><option value="ACTIVE">ACTIVE</option></select><Input aria-label="Начало" type="datetime-local" {...form.register("startsAt")} /><Input aria-label="Окончание" type="datetime-local" {...form.register("expiresAt")} /><Button disabled={createMutation.isPending} type="submit">Создать</Button></form>{Object.keys(form.formState.errors).length > 0 && <p className="mt-3 text-sm text-red-600">Проверьте обязательные поля.</p>}</CardContent></Card>}
    <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]"><Card><CardHeader><CardTitle>Список подписок</CardTitle><CardDescription>Все подписки клиентов с фильтрами по бренду, email и статусу</CardDescription></CardHeader><CardContent className="overflow-x-auto">{subscriptions.isLoading ? <p>Загрузка…</p> : subscriptions.isError ? <p className="text-red-600">Не удалось получить подписки.</p> : <><table className="w-full min-w-3xl text-sm"><thead><tr className="border-b text-left"><th className="p-3">Клиент</th><th className="p-3">Бренд</th><th className="p-3">Тариф</th><th className="p-3">Статус</th><th className="p-3">До</th><th /></tr></thead><tbody>{subscriptions.data?.items.map((item) => <tr className="border-b last:border-0" key={item.id}><td className="p-3">{item.customerEmail ?? "—"}</td><td className="p-3">{item.brandCode}</td><td className="p-3">{item.planCode ?? "—"}</td><td className="p-3"><Badge>{item.status}</Badge></td><td className="p-3">{new Date(item.expiresAt).toLocaleString("ru-RU")}</td><td className="p-3"><Button size="sm" variant="outline" onClick={() => { setSelectedId(item.id); setEditStatus(item.status); }}>Подробнее</Button></td></tr>)}</tbody></table><div className="mt-4 flex items-center justify-between"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Назад</Button><span className="text-sm text-muted-foreground">{page} / {totalPages}</span><Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Далее</Button></div></>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Детали подписки</CardTitle><CardDescription>Статус, тариф и токен доступа выбранной подписки</CardDescription></CardHeader><CardContent>{!selectedId ? <p className="text-sm text-muted-foreground">Выберите подписку.</p> : detail.isLoading ? <p>Загрузка…</p> : detail.isError ? <p className="text-red-600">Не удалось получить детали.</p> : detail.data && <div className="space-y-4"><div><p className="font-medium">{detail.data.customerEmail}</p><p className="text-xs text-muted-foreground">{detail.data.id}</p></div><dl className="grid grid-cols-2 gap-2 text-sm"><dt className="text-muted-foreground">Привязка к бренду</dt><dd>{detail.data.brandMembershipId ?? "—"}</dd><dt className="text-muted-foreground">Тариф</dt><dd>{detail.data.planCode ?? "Без тарифа"}</dd><dt className="text-muted-foreground">Версия записи</dt><dd>{detail.data.revision}</dd></dl>{mayWrite && <><select ref={planSelectRef} key={detail.data.id} aria-label="Тариф" className={`${selectClassName} w-full`} defaultValue={detail.data.planId ?? ""}><option value="">Без тарифа</option>{plans.data?.items.map((plan) => <option key={plan.id} value={plan.id}>{plan.brandCode} · {plan.name}</option>)}</select><select aria-label="Статус подписки" className={`${selectClassName} w-full`} value={editStatus} onChange={(event) => setEditStatus(event.target.value as Status)}>{subscriptionStatuses.map((value) => <option key={value}>{value}</option>)}</select><Input placeholder="Причина изменения" value={reason} onChange={(event) => setReason(event.target.value)} /><div className="flex flex-wrap gap-2"><Button disabled={!reason || updateMutation.isPending} onClick={() => updateMutation.mutate({ id: selectedId, body: { status: editStatus, planId: planSelectRef.current?.value || undefined, reason } })}>Сохранить</Button><Button variant="outline" disabled={rotateMutation.isPending} onClick={() => rotateMutation.mutate(selectedId)}>Обновить токен</Button><Button variant="outline" disabled={!reason || revokeMutation.isPending} onClick={() => revokeMutation.mutate({ id: selectedId, reason })}>Отозвать</Button></div></>}</div>}</CardContent></Card></div>
  </AppShell>;
}
