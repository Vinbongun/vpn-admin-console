"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { AdminCustomerQuery, CustomerSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { PageToolbar, ToolbarSearch } from "@/components/page-toolbar";
import { StatusBadge } from "@/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export function UsersPage() {
  const router = useRouter();
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
    <AppShell>
      <PageHeader title="Пользователи" description="Клиенты, их членства в брендах и подписки" />

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
          onRowClick={(customer) => router.push(`/users/${customer.id}`)}
        />
        <DataTablePagination page={page} pageCount={totalPages} onPageChange={setPage} />
      </div>
    </AppShell>
  );
}
