"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "@/api/client";
import type { AdminCustomerQuery, CustomerDetail, CustomerSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { PageToolbar, ToolbarSearch } from "@/components/page-toolbar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";

const liveStatuses = new Set(["PENDING", "TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED"]);
const pageSize = 25;

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
  { id: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  {
    id: "brands",
    header: "Бренды",
    cell: ({ row }) => row.original.memberships.map((membership) => membership.brandCode).join(", ") || "—",
  },
];

function SelectedCustomerFromQuery({ onSelect }: { onSelect: (customerId: string) => void }) {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId");

  useEffect(() => {
    if (customerId) onSelect(customerId);
  }, [customerId, onSelect]);

  return null;
}

export default function CustomersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [brandCode, setBrandCode] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string>();
  const [issuingMembershipId, setIssuingMembershipId] = useState<string>();
  const [issueForm, setIssueForm] = useState({ planId: "", startsAt: "", expiresAt: "" });

  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });
  const customers = useQuery({
    queryKey: ["admin-customers", page, search, brandCode, status],
    queryFn: () =>
      adminApi.listCustomers({
        page,
        pageSize,
        ...(search ? { search } : {}),
        ...(brandCode !== "all" ? { brandCode } : {}),
        ...(status !== "all" ? { status } : {}),
      } satisfies AdminCustomerQuery),
    retry: false,
  });
  const detail = useQuery({ queryKey: ["admin-customer", selectedId], queryFn: () => adminApi.getCustomer(selectedId!), enabled: Boolean(selectedId), retry: false });
  const plans = useQuery({ queryKey: ["admin-plans", "customer-card"], queryFn: () => adminApi.listPlans({ page: 1, pageSize: 100, status: "ACTIVE" }), retry: false });

  const refreshCustomer = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-customers"] }), queryClient.invalidateQueries({ queryKey: ["admin-customer", selectedId] })]);

  const membershipMutation = useMutation({
    mutationFn: ({ id, status: nextStatus }: { id: string; status: "ACTIVE" | "SUSPENDED" }) => adminApi.updateMembership(id, { status: nextStatus }),
    onSuccess: refreshCustomer,
    onError: () => toast.error("Не удалось изменить статус членства."),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status: nextStatus }: { id: string; status: "ACTIVE" | "SUSPENDED" }) => adminApi.updateCustomerStatus(id, { status: nextStatus }),
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

  const totalPages = Math.max(1, Math.ceil((customers.data?.total ?? 0) / (customers.data?.pageSize ?? pageSize)));

  const startIssuing = (membershipId: string) => {
    setIssuingMembershipId(membershipId);
    setIssueForm({ planId: "", ...defaultIssueDates() });
  };

  const hasLiveSubscription = (subscriptions: CustomerDetail["subscriptions"], brandCode: string) =>
    subscriptions.some((subscription) => subscription.brandCode === brandCode && liveStatuses.has(subscription.status));

  const selectCustomer = (customerId: string) => {
    setSelectedId(customerId);
    router.replace(`/users?customerId=${customerId}`);
  };
  const closeCustomer = () => {
    setSelectedId(undefined);
    router.replace("/users");
  };

  return (
    <AppShell>
      <Suspense fallback={null}>
        <SelectedCustomerFromQuery onSelect={setSelectedId} />
      </Suspense>
      <PageHeader title="Пользователи" description="Клиенты, их членства в брендах и подписки" />

      <PageToolbar>
        <ToolbarSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Email или идентификатор" />
        <Select
          items={[{ value: "all", label: "Все бренды" }, ...(brands.data?.map((brand) => ({ value: brand.code, label: brand.name })) ?? [])]}
          value={brandCode}
          onValueChange={(value) => { setBrandCode(value ?? "all"); setPage(1); }}
        >
          <SelectTrigger className="w-40" aria-label="Бренд">
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
        <Select
          items={[
            { value: "all", label: "Все статусы" },
            { value: "ACTIVE", label: "ACTIVE" },
            { value: "SUSPENDED", label: "SUSPENDED" },
          ]}
          value={status}
          onValueChange={(value) => { setStatus(value ?? "all"); setPage(1); }}
        >
          <SelectTrigger className="w-40" aria-label="Статус">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
          </SelectContent>
        </Select>
      </PageToolbar>

      <DataTable
        columns={columns}
        data={customers.data?.items ?? []}
        isLoading={customers.isLoading}
        isError={customers.isError}
        errorMessage="Не удалось получить клиентов."
        emptyMessage="Клиенты не найдены."
        onRowClick={(customer) => selectCustomer(customer.id)}
        isRowActive={(customer) => customer.id === selectedId}
      />
      <DataTablePagination page={page} pageCount={totalPages} onPageChange={setPage} />

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && closeCustomer()}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          {detail.isLoading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : detail.isError ? (
            <ErrorState className="p-6" description="Не удалось получить карточку клиента." />
          ) : detail.data ? (
            <>
              <DialogHeader className="border-b p-6 pb-4">
                <DialogTitle>{detail.data.email}</DialogTitle>
                <DialogDescription>{detail.data.id}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-6 overflow-y-auto p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusBadge status={detail.data.status} />
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
                  <p className="mb-3 text-sm font-medium text-muted-foreground">Бренды</p>
                  <div className="space-y-3">
                    {detail.data.memberships.map((membership, index) => {
                      const brandPlans = plans.data?.items.filter((plan) => plan.brandCode === membership.brandCode) ?? [];
                      const needsSubscription = !hasLiveSubscription(detail.data!.subscriptions, membership.brandCode);
                      return (
                        <div key={membership.id}>
                          {index > 0 && <Separator className="mb-3" />}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{membership.brandName}</p>
                              <p className="text-xs text-muted-foreground">{membership.brandCode}</p>
                              {membership.createdAt && (
                                <p className="text-xs text-muted-foreground">Регистрация: {new Date(membership.createdAt).toLocaleDateString()}</p>
                              )}
                            </div>
                            <StatusBadge status={membership.status} />
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
                            <FieldGroup className="mt-3 gap-3 rounded-lg border border-dashed p-3">
                              <p className="text-xs text-muted-foreground">У клиента нет активной подписки на этот бренд — выберите тариф и период.</p>
                              <Field>
                                <FieldLabel htmlFor={`plan-${membership.id}`}>Тариф</FieldLabel>
                                <Select
                                  items={brandPlans.map((plan) => ({ value: plan.id, label: plan.name }))}
                                  value={issueForm.planId}
                                  onValueChange={(value) => setIssueForm((value_) => ({ ...value_, planId: value ?? "" }))}
                                >
                                  <SelectTrigger id={`plan-${membership.id}`} className="w-full">
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
                              </Field>
                              <div className="grid grid-cols-2 gap-2">
                                <Field>
                                  <FieldLabel htmlFor={`starts-${membership.id}`}>Начало</FieldLabel>
                                  <Input id={`starts-${membership.id}`} type="datetime-local" value={issueForm.startsAt} onChange={(event) => setIssueForm((value) => ({ ...value, startsAt: event.target.value }))} />
                                </Field>
                                <Field>
                                  <FieldLabel htmlFor={`expires-${membership.id}`}>Окончание</FieldLabel>
                                  <Input id={`expires-${membership.id}`} type="datetime-local" value={issueForm.expiresAt} onChange={(event) => setIssueForm((value) => ({ ...value, expiresAt: event.target.value }))} />
                                </Field>
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
                            </FieldGroup>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="mb-3 text-sm font-medium text-muted-foreground">Подписки (все бренды)</p>
                  {detail.data.subscriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Подписок нет.</p>
                  ) : (
                    <div className="space-y-3">
                      {detail.data.subscriptions.map((subscription, index) => (
                        <div key={subscription.id}>
                          {index > 0 && <Separator className="mb-3" />}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{subscription.planName ?? subscription.planCode ?? "Без плана"}</p>
                              <p className="text-xs text-muted-foreground">{subscription.brandCode}</p>
                            </div>
                            <StatusBadge status={subscription.status} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(subscription.startsAt).toLocaleDateString()} – {new Date(subscription.expiresAt).toLocaleDateString()}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {subscription.endpointGroups.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Групп доступа нет</span>
                            ) : (
                              subscription.endpointGroups.map((group) => (
                                <span key={group.id} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                                  {group.name}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
