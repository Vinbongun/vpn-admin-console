"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { adminApi } from "@/api/client";
import type { AdminCustomerQuery, CustomerSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { PageToolbar, ToolbarSearch } from "@/components/page-toolbar";
import { StatusBadge } from "@/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllSubscriptionsTab } from "@/features/users/all-subscriptions-tab";
import { CustomerDetailDialog } from "@/features/users/customer-detail-dialog";

const pageSize = 25;

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

function CustomersTab({ selectedId, onSelectCustomer }: { selectedId: string | undefined; onSelectCustomer: (customerId: string) => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [brandCode, setBrandCode] = useState("all");
  const [status, setStatus] = useState("all");

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

  const totalPages = Math.max(1, Math.ceil((customers.data?.total ?? 0) / (customers.data?.pageSize ?? pageSize)));

  return (
    <div className="flex flex-col gap-4">
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
        onRowClick={(customer) => onSelectCustomer(customer.id)}
        isRowActive={(customer) => customer.id === selectedId}
      />
      <DataTablePagination page={page} pageCount={totalPages} onPageChange={setPage} />
    </div>
  );
}

export function UsersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"customers" | "subscriptions">("customers");
  const [selectedId, setSelectedId] = useState<string>();

  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });

  const selectCustomer = (customerId: string) => {
    setSelectedId(customerId);
    setTab("customers");
    router.replace(`/users?customerId=${customerId}`);
  };
  const closeCustomer = () => {
    setSelectedId(undefined);
    router.replace("/users");
  };

  return (
    <AppShell>
      <Suspense fallback={null}>
        <SelectedCustomerFromQuery onSelect={selectCustomer} />
      </Suspense>
      <PageHeader title="Пользователи" description="Клиенты, их членства в брендах и подписки" />

      <Tabs value={tab} onValueChange={(value) => setTab(value === "subscriptions" ? "subscriptions" : "customers")}>
        <TabsList>
          <TabsTrigger value="customers">По клиентам</TabsTrigger>
          <TabsTrigger value="subscriptions">Все подписки</TabsTrigger>
        </TabsList>
        <TabsContent value="customers">
          <CustomersTab selectedId={selectedId} onSelectCustomer={selectCustomer} />
        </TabsContent>
        <TabsContent value="subscriptions">
          <AllSubscriptionsTab staff={staff.data} />
        </TabsContent>
      </Tabs>

      <CustomerDetailDialog customerId={selectedId} onOpenChange={(open) => !open && closeCustomer()} />
    </AppShell>
  );
}
