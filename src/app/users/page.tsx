"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const customers = useQuery({ queryKey: ["admin-customers", page, search], queryFn: () => adminApi.listCustomers({ page, pageSize: 25, ...(search ? { search } : {}) }), retry: false });
  const detail = useQuery({ queryKey: ["admin-customer", selectedId], queryFn: () => adminApi.getCustomer(selectedId!), enabled: Boolean(selectedId), retry: false });
  const membershipMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) => adminApi.updateMembership(id, { status }),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-customers"] }), queryClient.invalidateQueries({ queryKey: ["admin-customer", selectedId] })]);
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) => adminApi.updateCustomerStatus(id, { status }),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-customers"] }), queryClient.invalidateQueries({ queryKey: ["admin-customer", selectedId] })]);
    },
  });
  const totalPages = Math.max(1, Math.ceil((customers.data?.total ?? 0) / (customers.data?.pageSize ?? 25)));

  return <AppShell><PageHeader title="Пользователи" description="Клиенты, их членства в брендах и подписки" />
    <Card className="mb-4"><CardContent className="flex gap-2 pt-6"><Input aria-label="Поиск клиентов" placeholder="Email или идентификатор" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></CardContent></Card>
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]"><Card><CardHeader><CardTitle>Клиенты</CardTitle><CardDescription>`GET /admin/v1/customers`</CardDescription></CardHeader><CardContent className="overflow-x-auto">{customers.isLoading ? <p>Загрузка…</p> : customers.isError ? <p className="text-red-600">Не удалось получить клиентов.</p> : <><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Email</th><th className="p-3">Статус</th><th className="p-3">Бренды</th><th /></tr></thead><tbody>{customers.data?.items.map((customer) => <tr className="border-b last:border-0" key={customer.id}><td className="p-3">{customer.email}</td><td className="p-3"><Badge>{customer.status}</Badge></td><td className="p-3">{customer.memberships.map((membership) => membership.brandCode).join(", ") || "—"}</td><td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => setSelectedId(customer.id)}>Подробнее</Button></td></tr>)}</tbody></table><div className="mt-4 flex items-center justify-between"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Назад</Button><span className="text-sm text-muted-foreground">{page} / {totalPages}</span><Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Далее</Button></div></>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Карточка клиента</CardTitle><CardDescription>`GET /admin/v1/customers/&#123;customerId&#125;`</CardDescription></CardHeader><CardContent>{!selectedId ? <p className="text-sm text-muted-foreground">Выберите клиента.</p> : detail.isLoading ? <p>Загрузка…</p> : detail.isError ? <p className="text-red-600">Не удалось получить карточку.</p> : detail.data && <div className="space-y-4">
      <div className="flex items-center justify-between"><div><p className="font-medium">{detail.data.email}</p><p className="text-xs text-muted-foreground">{detail.data.id}</p></div><Badge className={detail.data.status === "SUSPENDED" ? "bg-red-600 text-white" : undefined}>{detail.data.status}</Badge></div>
      <div className="flex gap-2"><Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: detail.data!.id, status: "SUSPENDED" })}>Заблокировать везде</Button><Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: detail.data!.id, status: "ACTIVE" })}>Разблокировать везде</Button></div>
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">Бренды</p>
        {detail.data.memberships.map((membership) => <div className="rounded-lg border p-3 mb-2" key={membership.id}><div className="flex items-center justify-between"><div><p className="font-medium">{membership.brandName}</p><p className="text-xs text-muted-foreground">{membership.brandCode}</p></div><Badge>{membership.status}</Badge></div><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" disabled={membershipMutation.isPending} onClick={() => membershipMutation.mutate({ id: membership.id, status: "ACTIVE" })}>Активировать</Button><Button size="sm" variant="outline" disabled={membershipMutation.isPending} onClick={() => membershipMutation.mutate({ id: membership.id, status: "SUSPENDED" })}>Приостановить</Button></div></div>)}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">Подписки (все бренды)</p>
        {detail.data.subscriptions.length === 0 ? <p className="text-sm text-muted-foreground">Подписок нет.</p> : detail.data.subscriptions.map((subscription) => <div className="rounded-lg border p-3 mb-2" key={subscription.id}>
          <div className="flex items-center justify-between"><div><p className="font-medium">{subscription.planName ?? subscription.planCode ?? "Без плана"}</p><p className="text-xs text-muted-foreground">{subscription.brandCode}</p></div><Badge>{subscription.status}</Badge></div>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(subscription.startsAt).toLocaleDateString()} – {new Date(subscription.expiresAt).toLocaleDateString()}</p>
          <div className="mt-2 flex flex-wrap gap-1">{subscription.endpointGroups.length === 0 ? <span className="text-xs text-muted-foreground">Групп доступа нет</span> : subscription.endpointGroups.map((group) => <Badge className="border border-border bg-transparent" key={group.id}>{group.name}</Badge>)}</div>
        </div>)}
      </div>
    </div>}</CardContent></Card></div>
  </AppShell>;
}
