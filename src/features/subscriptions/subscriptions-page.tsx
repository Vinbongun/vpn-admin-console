"use client";

import { useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { AdminSubscriptionQuery } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { PageToolbar, ToolbarSearch } from "@/components/page-toolbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subscriptionColumns } from "@/features/subscriptions/columns";
import { CreateSubscriptionDialog } from "@/features/subscriptions/create-dialog";
import { SubscriptionDetailSheet } from "@/features/subscriptions/detail-sheet";
import { useSubscriptions } from "@/features/subscriptions/queries";
import { subscriptionStatuses } from "@/features/subscriptions/schema";
import { can } from "@/lib/access-control";

const pageSize = 25;

export function SubscriptionsPage() {
  const [page, setPage] = useState(1);
  const [brandCode, setBrandCode] = useState("all");
  const [customerEmail, setCustomerEmail] = useState("");
  const [status, setStatus] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [selectedId, setSelectedId] = useState<string>();

  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });

  const sort = sorting[0];
  const subscriptions = useSubscriptions({
    page,
    pageSize,
    sortBy: (sort?.id as AdminSubscriptionQuery["sortBy"]) ?? "createdAt",
    sortOrder: sort?.desc ? "desc" : "asc",
    ...(brandCode !== "all" ? { brandCode } : {}),
    ...(customerEmail ? { customerEmail } : {}),
    ...(status !== "all" ? { status: status as AdminSubscriptionQuery["status"] } : {}),
  });

  const mayWrite = can(staff.data, "subscriptions.write");
  const totalPages = Math.max(1, Math.ceil((subscriptions.data?.total ?? 0) / (subscriptions.data?.pageSize ?? pageSize)));

  return (
    <AppShell>
      <PageHeader title="Подписки" description="Управление подписками клиентов" actions={mayWrite && <CreateSubscriptionDialog />} />

      <PageToolbar>
        <ToolbarSearch value={customerEmail} onChange={(value) => { setCustomerEmail(value); setPage(1); }} placeholder="Email клиента" />
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
          items={[{ value: "all", label: "Все статусы" }, ...subscriptionStatuses.map((value) => ({ value, label: value }))]}
          value={status}
          onValueChange={(value) => { setStatus(value ?? "all"); setPage(1); }}
        >
          <SelectTrigger className="w-40" aria-label="Статус">
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
      </PageToolbar>

      <DataTable
        columns={subscriptionColumns}
        data={subscriptions.data?.items ?? []}
        isLoading={subscriptions.isLoading}
        isError={subscriptions.isError}
        errorMessage="Не удалось получить подписки."
        emptyMessage="Подписки не найдены."
        onRowClick={(item) => setSelectedId(item.id)}
        isRowActive={(item) => item.id === selectedId}
        sorting={sorting}
        onSortingChange={(next) => { setSorting(next); setPage(1); }}
      />
      <DataTablePagination page={page} pageCount={totalPages} onPageChange={setPage} />

      <SubscriptionDetailSheet subscriptionId={selectedId} onOpenChange={(open) => !open && setSelectedId(undefined)} staff={staff.data} />
    </AppShell>
  );
}
