"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { adminApi } from "@/api/client";
import type { IssuedSubscriptionToken, SubscriptionSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { can } from "@/lib/access-control";

const subscriptionStatuses = ["PENDING", "TRIAL", "ACTIVE", "PAST_DUE", "EXPIRED", "SUSPENDED", "REVOKED"] as const;
type Status = SubscriptionSummary["status"];

const schema = z.object({
  brandMembershipId: z.uuid("Выберите привязку к бренду"),
  planId: z.string(),
  status: z.enum(["PENDING", "TRIAL", "ACTIVE"]),
  startsAt: z.string().min(1, "Укажите начало"),
  expiresAt: z.string().min(1, "Укажите окончание"),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<SubscriptionSummary>[] = [
  { id: "customer", header: "Клиент", cell: ({ row }) => row.original.customerEmail ?? "—" },
  { accessorKey: "brandCode", header: "Бренд" },
  { id: "plan", header: "Тариф", cell: ({ row }) => row.original.planCode ?? "—" },
  { id: "status", header: "Статус", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
  { id: "expiresAt", header: "До", cell: ({ row }) => new Date(row.original.expiresAt).toLocaleString("ru-RU") },
];

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [brandCode, setBrandCode] = useState("all");
  const [customerEmail, setCustomerEmail] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string>();
  const [editStatus, setEditStatus] = useState<Status>("ACTIVE");
  const [editPlanId, setEditPlanId] = useState("none");
  const [reason, setReason] = useState("");
  const [issuedToken, setIssuedToken] = useState<IssuedSubscriptionToken>();
  const [createOpen, setCreateOpen] = useState(false);

  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });
  const subscriptions = useQuery({
    queryKey: ["admin-subscriptions", page, brandCode, customerEmail, status],
    queryFn: () =>
      adminApi.listSubscriptions({
        page,
        pageSize: 25,
        sortBy: "createdAt",
        sortOrder: "desc",
        ...(brandCode !== "all" ? { brandCode } : {}),
        ...(customerEmail ? { customerEmail } : {}),
        ...(status !== "all" ? { status: status as Status } : {}),
      }),
    retry: false,
  });
  const detail = useQuery({ queryKey: ["admin-subscription", selectedId], queryFn: () => adminApi.getSubscription(selectedId!), enabled: Boolean(selectedId), retry: false });
  const customers = useQuery({ queryKey: ["admin-customers", "subscription-form"], queryFn: () => adminApi.listCustomers({ page: 1, pageSize: 100 }), retry: false });
  const plans = useQuery({ queryKey: ["admin-plans", "subscription-form"], queryFn: () => adminApi.listPlans({ page: 1, pageSize: 100, status: "ACTIVE" }), retry: false });
  const mayWrite = can(staff.data, "subscriptions.write");
  const totalPages = Math.max(1, Math.ceil((subscriptions.data?.total ?? 0) / (subscriptions.data?.pageSize ?? 25)));

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { brandMembershipId: "", planId: "none", status: "ACTIVE", startsAt: "", expiresAt: "" } });
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] }), queryClient.invalidateQueries({ queryKey: ["admin-subscription", selectedId] })]);

  const createMutation = useMutation({
    mutationFn: adminApi.createSubscription,
    onSuccess: async () => {
      form.reset({ brandMembershipId: "", planId: "none", status: "ACTIVE", startsAt: "", expiresAt: "" });
      setCreateOpen(false);
      toast.success("Подписка создана.");
      await refresh();
    },
    onError: () => toast.error("Не удалось создать подписку."),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status: Status; planId?: string; reason: string } }) => adminApi.updateSubscription(id, body),
    onSuccess: async () => {
      toast.success("Подписка обновлена.");
      await refresh();
    },
    onError: () => toast.error("Не удалось обновить подписку."),
  });
  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.revokeSubscription(id, reason),
    onSuccess: async () => {
      toast.success("Подписка отозвана.");
      await refresh();
    },
    onError: () => toast.error("Не удалось отозвать подписку."),
  });
  const rotateMutation = useMutation({
    mutationFn: (id: string) => adminApi.rotateSubscriptionToken(id),
    onSuccess: setIssuedToken,
    onError: () => toast.error("Не удалось обновить токен."),
  });

  const submit = form.handleSubmit((values) => {
    createMutation.mutate({
      brandMembershipId: values.brandMembershipId,
      ...(values.planId !== "none" ? { planId: values.planId } : {}),
      status: values.status,
      startsAt: new Date(values.startsAt).toISOString(),
      expiresAt: new Date(values.expiresAt).toISOString(),
    });
  });

  const openDetail = (subscription: SubscriptionSummary) => {
    setSelectedId(subscription.id);
    setEditStatus(subscription.status);
    setEditPlanId("none");
    setReason("");
  };

  return (
    <AppShell>
      <PageHeader
        title="Подписки"
        description="Управление подписками клиентов"
        actions={
          mayWrite && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>Создать подписку</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Создать подписку</DialogTitle>
                  <DialogDescription>Бренд клиента и тариф выбираются из уже существующих записей.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form className="space-y-4" onSubmit={submit}>
                    <FormField
                      control={form.control}
                      name="brandMembershipId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Привязка к бренду</FormLabel>
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Выберите привязку к бренду" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.data?.items.flatMap((customer) =>
                                customer.memberships.map((membership) => (
                                  <SelectItem key={membership.id} value={membership.id}>
                                    {customer.email} · {membership.brandCode}
                                  </SelectItem>
                                )),
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="planId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Тариф</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Без тарифа</SelectItem>
                                {plans.data?.items.map((plan) => (
                                  <SelectItem key={plan.id} value={plan.id}>
                                    {plan.brandCode} · {plan.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Статус</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PENDING">PENDING</SelectItem>
                                <SelectItem value="TRIAL">TRIAL</SelectItem>
                                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="startsAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Начало</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="expiresAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Окончание</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline">
                          Отмена
                        </Button>
                      </DialogClose>
                      <Button disabled={createMutation.isPending} type="submit">
                        {createMutation.isPending && <Spinner />}
                        Создать
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {issuedToken && (
        <Alert className="border-amber-500/50">
          <AlertTitle>Новый токен — сохраните сейчас</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Токен в открытом виде возвращается сервером только один раз и не сохраняется интерфейсом.</p>
            <code className="block break-all rounded-lg bg-muted p-3 text-xs text-foreground">{issuedToken.token}</code>
            <Button size="sm" variant="outline" onClick={() => setIssuedToken(undefined)}>
              Скрыть
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Select value={brandCode} onValueChange={(value) => { setBrandCode(value); setPage(1); }}>
            <SelectTrigger aria-label="Бренд">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все бренды</SelectItem>
              {brands.data?.map((brand) => (
                <SelectItem key={brand.id} value={brand.code}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input aria-label="Email клиента" placeholder="Email клиента" value={customerEmail} onChange={(event) => { setCustomerEmail(event.target.value); setPage(1); }} />
          <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
            <SelectTrigger aria-label="Статус">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {subscriptionStatuses.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Список подписок</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={subscriptions.data?.items ?? []}
            isLoading={subscriptions.isLoading}
            isError={subscriptions.isError}
            errorMessage="Не удалось получить подписки."
            emptyMessage="Подписки не найдены."
            onRowClick={openDetail}
            isRowActive={(item) => item.id === selectedId}
          />
          <DataTablePagination page={page} pageCount={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(undefined)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail.isLoading ? (
            <div className="space-y-3 pt-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : detail.isError ? (
            <p className="pt-6 text-sm text-destructive">Не удалось получить детали.</p>
          ) : detail.data ? (
            <>
              <SheetHeader>
                <SheetTitle>{detail.data.customerEmail}</SheetTitle>
                <SheetDescription>{detail.data.id}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">Привязка к бренду</dt>
                  <dd>{detail.data.brandMembershipId ?? "—"}</dd>
                  <dt className="text-muted-foreground">Тариф</dt>
                  <dd>{detail.data.planCode ?? "Без тарифа"}</dd>
                  <dt className="text-muted-foreground">Версия записи</dt>
                  <dd>{detail.data.revision}</dd>
                </dl>
                {mayWrite && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="space-y-2">
                      <Label>Тариф</Label>
                      <Select value={editPlanId} onValueChange={setEditPlanId}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Без изменений</SelectItem>
                          {plans.data?.items.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.brandCode} · {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Статус подписки</Label>
                      <Select value={editStatus} onValueChange={(value) => setEditStatus(value as Status)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {subscriptionStatuses.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Причина изменения</Label>
                      <Input placeholder="Причина изменения" value={reason} onChange={(event) => setReason(event.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        disabled={!reason || updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: selectedId!, body: { status: editStatus, planId: editPlanId !== "none" ? editPlanId : undefined, reason } })}
                      >
                        {updateMutation.isPending && <Spinner />}
                        Сохранить
                      </Button>
                      <Button variant="outline" disabled={rotateMutation.isPending} onClick={() => rotateMutation.mutate(selectedId!)}>
                        {rotateMutation.isPending && <Spinner />}
                        Обновить токен
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" disabled={!reason || revokeMutation.isPending}>
                            Отозвать
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Отозвать подписку?</AlertDialogTitle>
                            <AlertDialogDescription>Клиент немедленно потеряет доступ ко всем группам endpoint&#39;ов этой подписки. Причина: «{reason}».</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={() => revokeMutation.mutate({ id: selectedId!, reason })}>Отозвать</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
