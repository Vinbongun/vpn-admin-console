"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi } from "@/api/client";
import type { CustomerDetail, CustomerSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const liveStatuses = new Set(["PENDING", "TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED"]);

function toLocalDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultIssueDates() {
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return { startsAt: toLocalDateTimeInput(now), expiresAt: toLocalDateTimeInput(expires) };
}

const columns: ColumnDef<CustomerSummary>[] = [
  { accessorKey: "email", header: "Email" },
  { id: "status", header: "Статус", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
  {
    id: "brands",
    header: "Бренды",
    cell: ({ row }) => row.original.memberships.map((membership) => membership.brandCode).join(", ") || "—",
  },
];

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [issuingMembershipId, setIssuingMembershipId] = useState<string>();
  const [issueForm, setIssueForm] = useState({ planId: "", startsAt: "", expiresAt: "" });

  const customers = useQuery({ queryKey: ["admin-customers", page, search], queryFn: () => adminApi.listCustomers({ page, pageSize: 25, ...(search ? { search } : {}) }), retry: false });
  const detail = useQuery({ queryKey: ["admin-customer", selectedId], queryFn: () => adminApi.getCustomer(selectedId!), enabled: Boolean(selectedId), retry: false });
  const plans = useQuery({ queryKey: ["admin-plans", "customer-card"], queryFn: () => adminApi.listPlans({ page: 1, pageSize: 100, status: "ACTIVE" }), retry: false });

  const refreshCustomer = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-customers"] }), queryClient.invalidateQueries({ queryKey: ["admin-customer", selectedId] })]);

  const membershipMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) => adminApi.updateMembership(id, { status }),
    onSuccess: refreshCustomer,
    onError: () => toast.error("Не удалось изменить статус членства."),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) => adminApi.updateCustomerStatus(id, { status }),
    onSuccess: refreshCustomer,
    onError: () => toast.error("Не удалось изменить статус клиента."),
  });
  const issueMutation = useMutation({
    mutationFn: (input: { brandMembershipId: string; planId: string; startsAt: string; expiresAt: string }) =>
      adminApi.createSubscription({ brandMembershipId: input.brandMembershipId, ...(input.planId ? { planId: input.planId } : {}), status: "ACTIVE", startsAt: new Date(input.startsAt).toISOString(), expiresAt: new Date(input.expiresAt).toISOString() }),
    onSuccess: async () => {
      setIssuingMembershipId(undefined);
      toast.success("Подписка выдана.");
      await refreshCustomer();
    },
    onError: () => toast.error("Не удалось выдать подписку."),
  });

  const totalPages = Math.max(1, Math.ceil((customers.data?.total ?? 0) / (customers.data?.pageSize ?? 25)));

  const startIssuing = (membershipId: string) => {
    setIssuingMembershipId(membershipId);
    setIssueForm({ planId: "", ...defaultIssueDates() });
  };

  const hasLiveSubscription = (subscriptions: CustomerDetail["subscriptions"], brandCode: string) =>
    subscriptions.some((subscription) => subscription.brandCode === brandCode && liveStatuses.has(subscription.status));

  return (
    <AppShell>
      <PageHeader title="Пользователи" description="Клиенты, их членства в брендах и подписки" />
      <Card>
        <CardContent className="pt-6">
          <Input aria-label="Поиск клиентов" placeholder="Email или идентификатор" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={customers.data?.items ?? []}
            isLoading={customers.isLoading}
            isError={customers.isError}
            errorMessage="Не удалось получить клиентов."
            emptyMessage="Клиенты не найдены."
            onRowClick={(customer) => setSelectedId(customer.id)}
            isRowActive={(customer) => customer.id === selectedId}
          />
          <DataTablePagination page={page} pageCount={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(undefined)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {detail.isLoading ? (
            <div className="space-y-3 pt-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : detail.isError ? (
            <p className="pt-6 text-sm text-destructive">Не удалось получить карточку клиента.</p>
          ) : detail.data ? (
            <>
              <SheetHeader>
                <SheetTitle>{detail.data.email}</SheetTitle>
                <SheetDescription>{detail.data.id}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-6">
                <div className="flex items-center justify-between">
                  <Badge variant={detail.data.status === "SUSPENDED" ? "destructive" : "default"}>{detail.data.status}</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: detail.data!.id, status: "SUSPENDED" })}>
                      Заблокировать везде
                    </Button>
                    <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: detail.data!.id, status: "ACTIVE" })}>
                      Разблокировать везде
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Бренды</p>
                  <div className="space-y-2">
                    {detail.data.memberships.map((membership) => {
                      const brandPlans = plans.data?.items.filter((plan) => plan.brandCode === membership.brandCode) ?? [];
                      const needsSubscription = !hasLiveSubscription(detail.data!.subscriptions, membership.brandCode);
                      return (
                        <Card key={membership.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{membership.brandName}</p>
                                <p className="text-xs text-muted-foreground">{membership.brandCode}</p>
                              </div>
                              <Badge>{membership.status}</Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" disabled={membershipMutation.isPending} onClick={() => membershipMutation.mutate({ id: membership.id, status: "ACTIVE" })}>
                                Активировать
                              </Button>
                              <Button size="sm" variant="outline" disabled={membershipMutation.isPending} onClick={() => membershipMutation.mutate({ id: membership.id, status: "SUSPENDED" })}>
                                Приостановить
                              </Button>
                              {needsSubscription && issuingMembershipId !== membership.id && (
                                <Button size="sm" onClick={() => startIssuing(membership.id)}>
                                  Выдать подписку
                                </Button>
                              )}
                            </div>
                            {needsSubscription && issuingMembershipId === membership.id && (
                              <div className="mt-3 space-y-2 rounded-lg border border-dashed p-3">
                                <p className="text-xs text-muted-foreground">У клиента нет активной подписки на этот бренд — выберите тариф и период.</p>
                                <Select value={issueForm.planId} onValueChange={(value) => setIssueForm((value_) => ({ ...value_, planId: value }))}>
                                  <SelectTrigger aria-label="Тариф" className="w-full">
                                    <SelectValue placeholder="Без тарифа" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {brandPlans.map((plan) => (
                                      <SelectItem key={plan.id} value={plan.id}>
                                        {plan.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input aria-label="Начало" type="datetime-local" value={issueForm.startsAt} onChange={(event) => setIssueForm((value) => ({ ...value, startsAt: event.target.value }))} />
                                  <Input aria-label="Окончание" type="datetime-local" value={issueForm.expiresAt} onChange={(event) => setIssueForm((value) => ({ ...value, expiresAt: event.target.value }))} />
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" disabled={issueMutation.isPending} onClick={() => issueMutation.mutate({ brandMembershipId: membership.id, ...issueForm })}>
                                    {issueMutation.isPending && <Spinner />}
                                    Выдать
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setIssuingMembershipId(undefined)}>
                                    Отмена
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Подписки (все бренды)</p>
                  {detail.data.subscriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Подписок нет.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.data.subscriptions.map((subscription) => (
                        <Card key={subscription.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{subscription.planName ?? subscription.planCode ?? "Без плана"}</p>
                                <p className="text-xs text-muted-foreground">{subscription.brandCode}</p>
                              </div>
                              <Badge>{subscription.status}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(subscription.startsAt).toLocaleDateString()} – {new Date(subscription.expiresAt).toLocaleDateString()}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {subscription.endpointGroups.length === 0 ? (
                                <span className="text-xs text-muted-foreground">Групп доступа нет</span>
                              ) : (
                                subscription.endpointGroups.map((group) => (
                                  <Badge key={group.id} variant="outline">
                                    {group.name}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
