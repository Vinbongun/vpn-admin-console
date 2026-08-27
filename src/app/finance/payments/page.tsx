"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { PaymentSummary } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentDetailDialog } from "@/features/payments/payment-detail-dialog";
import { PaymentsSummaryCards } from "@/features/payments/payments-summary";
import { paymentStatuses } from "@/features/payments/schema";
import { can } from "@/lib/access-control";

const pageSize = 25;

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

function toIso(datetimeLocal: string): string | undefined {
  if (!datetimeLocal) return undefined;
  const date = new Date(datetimeLocal);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const columns: ColumnDef<PaymentSummary>[] = [
  { id: "createdAt", header: "Дата", cell: ({ row }) => formatDate(row.original.createdAt) },
  { accessorKey: "brandCode", header: "Бренд" },
  { accessorKey: "customerEmail", header: "Клиент" },
  { id: "plan", header: "Тариф", cell: ({ row }) => row.original.planName ?? row.original.planCode },
  { id: "amount", header: "Сумма", cell: ({ row }) => `${row.original.amount} ${row.original.currency}` },
  { id: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { id: "gatewayCode", header: "Шлюз", cell: ({ row }) => row.original.gatewayCode ?? "—" },
  { id: "methodName", header: "Способ", cell: ({ row }) => row.original.methodName ?? "—" },
  { id: "maskedPan", header: "Карта", cell: ({ row }) => row.original.maskedPan ?? "—" },
];

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [brandCode, setBrandCode] = useState("all");
  const [planCode, setPlanCode] = useState("all");
  const [status, setStatus] = useState("all");
  const [gatewayCode, setGatewayCode] = useState("all");
  const [methodCode, setMethodCode] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>();

  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "finance.write");
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });
  const plans = useQuery({ queryKey: ["admin-plans-all"], queryFn: () => adminApi.listPlans({ page: 1, pageSize: 100 }), retry: false });
  const gateways = useQuery({ queryKey: ["admin-payment-gateways"], queryFn: adminApi.listPaymentGateways, retry: false });
  const methods = gateways.data?.flatMap((gateway) => gateway.methods.map((method) => ({ ...method, gatewayName: gateway.name }))) ?? [];

  const summaryBrandCodes = brandCode !== "all" ? brandCode : undefined;
  const payments = useQuery({
    queryKey: ["admin-payments", page, brandCode, planCode, status, gatewayCode, methodCode, dateFrom, dateTo],
    queryFn: () =>
      adminApi.listPayments({
        page,
        pageSize,
        ...(brandCode !== "all" ? { brandCode } : {}),
        ...(planCode !== "all" ? { planCode } : {}),
        ...(status !== "all" ? { status: status as (typeof paymentStatuses)[number] } : {}),
        ...(gatewayCode !== "all" ? { gatewayCode } : {}),
        ...(methodCode !== "all" ? { methodCode } : {}),
        ...(toIso(dateFrom) ? { dateFrom: toIso(dateFrom) } : {}),
        ...(toIso(dateTo) ? { dateTo: toIso(dateTo) } : {}),
      }),
    retry: false,
  });

  const totalPages = Math.max(1, Math.ceil((payments.data?.total ?? 0) / (payments.data?.pageSize ?? pageSize)));
  const resetPage = () => setPage(1);

  return (
    <AppShell>
      <PageHeader title="Платежи" description="Все платежи по подпискам — детали шлюза, способа оплаты и возвратов" />

      <PaymentsSummaryCards brandCodes={summaryBrandCodes} />

      <SectionHeader title="Все платежи" />
      <Card>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            <Select
              items={[{ value: "all", label: "Все бренды" }, ...(brands.data?.map((brand) => ({ value: brand.code, label: brand.name })) ?? [])]}
              value={brandCode}
              onValueChange={(value) => { setBrandCode(value ?? "all"); resetPage(); }}
            >
              <SelectTrigger aria-label="Бренд">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Бренд</SelectLabel>
                  <SelectItem value="all">Все бренды</SelectItem>
                  {brands.data?.map((brand) => (
                    <SelectItem key={brand.id} value={brand.code}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              items={[{ value: "all", label: "Все тарифы" }, ...(plans.data?.items.map((plan) => ({ value: plan.code, label: plan.name })) ?? [])]}
              value={planCode}
              onValueChange={(value) => { setPlanCode(value ?? "all"); resetPage(); }}
            >
              <SelectTrigger aria-label="Тариф">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Тариф</SelectLabel>
                  <SelectItem value="all">Все тарифы</SelectItem>
                  {plans.data?.items.map((plan) => (
                    <SelectItem key={plan.id} value={plan.code}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              items={[{ value: "all", label: "Все статусы" }, ...paymentStatuses.map((value) => ({ value, label: value }))]}
              value={status}
              onValueChange={(value) => { setStatus(value ?? "all"); resetPage(); }}
            >
              <SelectTrigger aria-label="Статус">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Статус</SelectLabel>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {paymentStatuses.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              items={[{ value: "all", label: "Все шлюзы" }, ...(gateways.data?.map((gateway) => ({ value: gateway.code, label: gateway.name })) ?? [])]}
              value={gatewayCode}
              onValueChange={(value) => { setGatewayCode(value ?? "all"); setMethodCode("all"); resetPage(); }}
            >
              <SelectTrigger aria-label="Шлюз">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Шлюз</SelectLabel>
                  <SelectItem value="all">Все шлюзы</SelectItem>
                  {gateways.data?.map((gateway) => (
                    <SelectItem key={gateway.id} value={gateway.code}>
                      {gateway.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              items={[{ value: "all", label: "Все способы" }, ...methods.map((method) => ({ value: method.code, label: `${method.name} (${method.gatewayName})` }))]}
              value={methodCode}
              onValueChange={(value) => { setMethodCode(value ?? "all"); resetPage(); }}
            >
              <SelectTrigger aria-label="Способ оплаты">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Способ оплаты</SelectLabel>
                  <SelectItem value="all">Все способы</SelectItem>
                  {methods.map((method) => (
                    <SelectItem key={method.id} value={method.code}>
                      {method.name} ({method.gatewayName})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Input aria-label="Дата от" type="datetime-local" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); resetPage(); }} />
            <Input aria-label="Дата до" type="datetime-local" value={dateTo} onChange={(event) => { setDateTo(event.target.value); resetPage(); }} />
          </div>
          <DataTable
            columns={columns}
            data={payments.data?.items ?? []}
            isLoading={payments.isLoading}
            isError={payments.isError}
            errorMessage="Не удалось получить платежи."
            emptyMessage="Платежи не найдены."
            onRowClick={(item) => setSelectedPaymentId(item.id)}
            isRowActive={(item) => item.id === selectedPaymentId}
          />
          <DataTablePagination page={page} pageCount={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>

      <PaymentDetailDialog paymentId={selectedPaymentId} onOpenChange={(open) => !open && setSelectedPaymentId(undefined)} mayWrite={mayWrite} />
    </AppShell>
  );
}
