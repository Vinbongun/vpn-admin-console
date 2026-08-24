"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CircleDollarSign, Repeat, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { OrderSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const orderStatuses = ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"] as const;
const pageSize = 25;

const columns: ColumnDef<OrderSummary>[] = [
  { accessorKey: "customerEmail", header: "Клиент" },
  { accessorKey: "brandCode", header: "Бренд" },
  { id: "plan", header: "Тариф", cell: ({ row }) => row.original.planName },
  { accessorKey: "kind", header: "Тип", cell: ({ row }) => <Badge variant="outline">{row.original.kind}</Badge> },
  { accessorKey: "status", header: "Статус", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
  {
    id: "amount",
    header: "Сумма",
    cell: ({ row }) => `${row.original.amount} ${row.original.currency}`,
  },
  {
    id: "createdAt",
    header: "Дата",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("ru-RU"),
  },
];

export default function FinancePage() {
  const [page, setPage] = useState(1);
  const [brandCode, setBrandCode] = useState("all");
  const [status, setStatus] = useState("all");

  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });
  const summary = useQuery({ queryKey: ["admin-finance-summary"], queryFn: adminApi.getFinanceSummary, retry: false });
  const orders = useQuery({
    queryKey: ["admin-orders", page, brandCode, status],
    queryFn: () =>
      adminApi.listOrders({
        page,
        pageSize,
        ...(brandCode !== "all" ? { brandCode } : {}),
        ...(status !== "all" ? { status: status as (typeof orderStatuses)[number] } : {}),
      }),
    retry: false,
  });

  const totalPages = Math.max(1, Math.ceil((orders.data?.total ?? 0) / (orders.data?.pageSize ?? pageSize)));
  const totalRevenue = summary.data?.revenueByBrand.reduce<Record<string, number>>((acc, row) => {
    acc[row.currency] = (acc[row.currency] ?? 0) + row.amount;
    return acc;
  }, {});

  return (
    <AppShell>
      <PageHeader title="Финансы" description="Оплаченные заказы, продления и выручка по брендам" />

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
        <StatCard
          label="Выручка всего"
          icon={CircleDollarSign}
          value={
            summary.isLoading
              ? "…"
              : summary.isError || !totalRevenue || Object.keys(totalRevenue).length === 0
                ? "—"
                : Object.entries(totalRevenue)
                    .map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`)
                    .join(", ")
          }
        />
        <StatCard label="Новые подписки" icon={ShoppingCart} value={summary.isLoading ? "…" : (summary.data?.paidOrdersByKind.NEW ?? 0)} />
        <StatCard label="Продления" icon={Repeat} value={summary.isLoading ? "…" : (summary.data?.paidOrdersByKind.RENEWAL ?? 0)} />
      </div>

      {summary.data && summary.data.revenueByBrand.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Выручка по брендам</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {summary.data.revenueByBrand.map((row) => (
              <Badge variant="outline" key={`${row.brandCode}-${row.currency}`}>
                {row.brandCode}: {row.amount.toFixed(2)} {row.currency}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Select
            items={[{ value: "all", label: "Все бренды" }, ...(brands.data?.map((brand) => ({ value: brand.code, label: brand.name })) ?? [])]}
            value={brandCode}
            onValueChange={(value) => {
              setBrandCode(value ?? "all");
              setPage(1);
            }}
          >
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
          <Select
            items={[{ value: "all", label: "Все статусы" }, ...orderStatuses.map((value) => ({ value, label: value }))]}
            value={status}
            onValueChange={(value) => {
              setStatus(value ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Статус">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {orderStatuses.map((value) => (
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
          <CardTitle>Заказы</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={orders.data?.items ?? []}
            isLoading={orders.isLoading}
            isError={orders.isError}
            errorMessage="Не удалось получить заказы."
            emptyMessage="Заказы не найдены."
          />
          <DataTablePagination page={page} pageCount={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
