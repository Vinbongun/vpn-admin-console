"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { adminApi } from "@/api/client";
import type { CreateSubscription, IssuedSubscriptionToken, SubscriptionSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { can } from "@/lib/access-control";

const schema = z.object({
  brandMembershipId: z.uuid("Введите UUID membership"),
  planId: z.union([z.uuid("Введите UUID тарифа"), z.literal("")]),
  status: z.enum(["PENDING", "TRIAL", "ACTIVE"]),
  startsAt: z.string().min(1),
  expiresAt: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;
const column = createColumnHelper<SubscriptionSummary>();

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [issuedToken, setIssuedToken] = useState<IssuedSubscriptionToken>();
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const subscriptions = useQuery({ queryKey: ["admin-subscriptions"], queryFn: adminApi.listSubscriptions, retry: false });
  const mayWrite = can(staff.data, "subscriptions.write");
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { brandMembershipId: "", planId: "", status: "ACTIVE", startsAt: "", expiresAt: "" } });

  const createMutation = useMutation({
    mutationFn: adminApi.createSubscription,
    onSuccess: async () => { form.reset(); await queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] }); },
  });
  const rotateMutation = useMutation({ mutationFn: (id: string) => adminApi.rotateSubscriptionToken(id), onSuccess: setIssuedToken });

  const columns = [
    column.accessor("brandCode", { header: "Бренд" }),
    column.accessor("planCode", { header: "Тариф", cell: (info) => info.getValue() ?? "—" }),
    column.accessor("status", { header: "Статус", cell: (info) => <Badge>{info.getValue()}</Badge> }),
    column.accessor("expiresAt", { header: "Действует до", cell: (info) => new Date(info.getValue()).toLocaleString("ru-RU") }),
    column.accessor("revision", { header: "Ревизия" }),
    column.display({ id: "actions", cell: ({ row }) => <Button size="sm" variant="outline" disabled={!mayWrite || rotateMutation.isPending} onClick={() => rotateMutation.mutate(row.original.id)}>Ротировать token</Button> }),
  ];
  // TanStack Table intentionally exposes non-memoizable functions; rows remain local to this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data: subscriptions.data ?? [], columns, getCoreRowModel: getCoreRowModel() });

  const submit = form.handleSubmit((values) => {
    const payload: CreateSubscription = {
      brandMembershipId: values.brandMembershipId,
      ...(values.planId ? { planId: values.planId } : {}),
      status: values.status,
      startsAt: new Date(values.startsAt).toISOString(),
      expiresAt: new Date(values.expiresAt).toISOString(),
    };
    createMutation.mutate(payload);
  });

  return <AppShell><PageHeader title="Подписки" description="Контракты admin API OpenAPI 0.3.0" />
    {issuedToken && <Card className="mb-4 border-amber-500/50"><CardHeader><CardTitle>Новый token — сохраните сейчас</CardTitle><CardDescription>Backend возвращает plaintext только один раз. После закрытия он не сохраняется в интерфейсе.</CardDescription></CardHeader><CardContent><code className="block break-all rounded-lg bg-muted p-3 text-sm">{issuedToken.token}</code><Button className="mt-3" variant="outline" onClick={() => setIssuedToken(undefined)}>Скрыть token</Button></CardContent></Card>}
    {mayWrite && <Card className="mb-4"><CardHeader><CardTitle>Создать подписку</CardTitle><CardDescription>Frontend отправляет DTO без применения бизнес-правил.</CardDescription></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={submit}><Input aria-label="Membership UUID" placeholder="Membership UUID" {...form.register("brandMembershipId")} /><Input aria-label="Plan UUID" placeholder="Plan UUID (необязательно)" {...form.register("planId")} /><select className="h-10 rounded-lg border bg-background px-3 text-sm" {...form.register("status")}><option value="PENDING">PENDING</option><option value="TRIAL">TRIAL</option><option value="ACTIVE">ACTIVE</option></select><Input aria-label="Начало" type="datetime-local" {...form.register("startsAt")} /><Input aria-label="Окончание" type="datetime-local" {...form.register("expiresAt")} /><Button disabled={createMutation.isPending} type="submit">Создать</Button></form>{Object.keys(form.formState.errors).length > 0 && <p className="mt-3 text-sm text-red-600">Проверьте формат полей по контракту.</p>}{createMutation.isError && <p className="mt-3 text-sm text-red-600">Admin API отклонил создание подписки.</p>}</CardContent></Card>}
    <Card><CardHeader><CardTitle>Список подписок</CardTitle><CardDescription>Данные `GET /admin/v1/subscriptions`</CardDescription></CardHeader><CardContent className="overflow-x-auto">{subscriptions.isLoading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : subscriptions.isError ? <p className="text-sm text-red-600">Не удалось получить подписки.</p> : <table className="w-full min-w-3xl text-sm"><thead>{table.getHeaderGroups().map((group) => <tr key={group.id} className="border-b text-left">{group.headers.map((header) => <th className="p-3 font-medium" key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => <tr className="border-b last:border-0" key={row.id}>{row.getVisibleCells().map((cell) => <td className="p-3" key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table>}</CardContent></Card>
  </AppShell>;
}
