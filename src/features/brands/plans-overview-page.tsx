"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { PlanSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { PageToolbar } from "@/components/page-toolbar";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const pageSize = 25;

export function PlansOverviewPage() {
  const [page, setPage] = useState(1);
  const [brandId, setBrandId] = useState("all");
  const [status, setStatus] = useState("all");

  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });
  const brandCode = brandId !== "all" ? brands.data?.find((brand) => brand.id === brandId)?.code : undefined;
  const plans = useQuery({
    queryKey: ["admin-plans-overview", page, brandCode, status],
    queryFn: () => adminApi.listPlans({ page, pageSize, ...(brandCode ? { brandCode } : {}), ...(status !== "all" ? { status } : {}) }),
    retry: false,
  });

  const brandName = (code: string) => brands.data?.find((brand) => brand.code === code)?.name ?? code;

  const columns: ColumnDef<PlanSummary>[] = [
    {
      id: "brand",
      header: "Бренд",
      cell: ({ row }) => <span className="font-medium">{brandName(row.original.brandCode)}</span>,
    },
    {
      id: "name",
      header: "Тариф",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.code}</p>
        </div>
      ),
    },
    { accessorKey: "billingModel", header: "Модель" },
    { accessorKey: "serviceLine", header: "Линейка" },
    { accessorKey: "deviceLimit", header: "Устройств" },
    { id: "isTrial", header: "Триал", cell: ({ row }) => (row.original.isTrial ? <Badge variant="outline">Триал</Badge> : "—") },
    { id: "price", header: "Цена", cell: ({ row }) => (row.original.price ? `${row.original.price.amount} ₽` : "—") },
    { id: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="text-right">
          <Button size="sm" variant="outline" render={<Link href={`/brands/${row.original.brandId}`} />} nativeButton={false}>
            Открыть в бренде
          </Button>
        </div>
      ),
    },
  ];

  const totalPages = Math.max(1, Math.ceil((plans.data?.total ?? 0) / (plans.data?.pageSize ?? pageSize)));

  return (
    <AppShell>
      <PageHeader title="Тарифы" description="Все тарифы всех брендов платформы — только просмотр, редактирование доступно на странице бренда" />

      <PageToolbar>
        <Select
          items={[{ value: "all", label: "Все бренды" }, ...(brands.data?.map((brand) => ({ value: brand.id, label: brand.name })) ?? [])]}
          value={brandId}
          onValueChange={(value) => {
            setBrandId(value ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48" aria-label="Бренд">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все бренды</SelectItem>
            {brands.data?.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: "all", label: "Все статусы" },
            { value: "ACTIVE", label: "ACTIVE" },
            { value: "ARCHIVED", label: "ARCHIVED" },
          ]}
          value={status}
          onValueChange={(value) => {
            setStatus(value ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40" aria-label="Статус">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
          </SelectContent>
        </Select>
      </PageToolbar>

      <DataTable
        columns={columns}
        data={plans.data?.items ?? []}
        isLoading={plans.isLoading}
        isError={plans.isError}
        errorMessage="Не удалось получить тарифы."
        emptyMessage="Тарифы не найдены."
      />
      <DataTablePagination page={page} pageCount={totalPages} onPageChange={setPage} />
    </AppShell>
  );
}
