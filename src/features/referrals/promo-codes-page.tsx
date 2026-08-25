"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { adminApi } from "@/api/client";
import type { AdminPromoCodeQuery, PromoCode } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTablePagination } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { PageToolbar, ToolbarSearch } from "@/components/page-toolbar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PromoCodeDialog } from "@/features/referrals/promo-code-dialog";
import { can } from "@/lib/access-control";

const pageSize = 25;

export function PromoCodesPage() {
  const [page, setPage] = useState(1);
  const [code, setCode] = useState("");
  const [brandId, setBrandId] = useState("all");
  const [referralPartnerId, setReferralPartnerId] = useState("all");
  const [status, setStatus] = useState("all");

  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "finance.write");
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });
  const partners = useQuery({ queryKey: ["admin-referral-partners"], queryFn: () => adminApi.listReferralPartners(), retry: false });
  const promoCodes = useQuery({
    queryKey: ["admin-promo-codes", page, code, brandId, referralPartnerId, status],
    queryFn: () =>
      adminApi.listPromoCodes({
        page,
        pageSize,
        ...(code ? { code } : {}),
        ...(brandId !== "all" ? { brandId } : {}),
        ...(referralPartnerId !== "all" ? { referralPartnerId } : {}),
        ...(status !== "all" ? { status: status as AdminPromoCodeQuery["status"] } : {}),
      }),
    retry: false,
  });

  const partnerName = (id: string) => partners.data?.find((partner) => partner.id === id)?.name ?? id;
  const brandNames = (ids: string[]) => ids.map((id) => brands.data?.find((brand) => brand.id === id)?.name ?? id).join(", ");

  const columns: ColumnDef<PromoCode>[] = [
    { accessorKey: "code", header: "Код", cell: ({ row }) => <span className="font-medium">{row.original.code}</span> },
    { id: "partner", header: "Партнёр", cell: ({ row }) => partnerName(row.original.referralPartnerId) },
    {
      id: "discount",
      header: "Скидка",
      cell: ({ row }) => (row.original.discountType === "PERCENT" ? `${row.original.discountValue}%` : `${row.original.discountValue}`),
    },
    { id: "payoutPercent", header: "Выплата", cell: ({ row }) => `${row.original.payoutPercent}%` },
    { id: "brands", header: "Бренды", cell: ({ row }) => brandNames(row.original.brandIds) || "—" },
    { id: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    ...(mayWrite
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }: { row: { original: PromoCode } }) => (
              <div className="text-right">
                <PromoCodeDialog promoCode={row.original} trigger={<Button size="sm" variant="outline">Изменить</Button>} />
              </div>
            ),
          } satisfies ColumnDef<PromoCode>,
        ]
      : []),
  ];

  const totalPages = Math.max(1, Math.ceil((promoCodes.data?.total ?? 0) / (promoCodes.data?.pageSize ?? pageSize)));

  return (
    <AppShell>
      <PageHeader title="Промокоды" description="Коды со скидкой клиенту и выплатой партнёру" actions={mayWrite && <PromoCodeDialog />} />

      <PageToolbar>
        <ToolbarSearch value={code} onChange={(value) => { setCode(value); setPage(1); }} placeholder="Поиск по коду" />
        <Select
          items={[{ value: "all", label: "Все бренды" }, ...(brands.data?.map((brand) => ({ value: brand.id, label: brand.name })) ?? [])]}
          value={brandId}
          onValueChange={(value) => { setBrandId(value ?? "all"); setPage(1); }}
        >
          <SelectTrigger className="w-40" aria-label="Бренд">
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
          items={[{ value: "all", label: "Все партнёры" }, ...(partners.data?.map((partner) => ({ value: partner.id, label: partner.name })) ?? [])]}
          value={referralPartnerId}
          onValueChange={(value) => { setReferralPartnerId(value ?? "all"); setPage(1); }}
        >
          <SelectTrigger className="w-40" aria-label="Партнёр">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все партнёры</SelectItem>
            {partners.data?.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                {partner.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: "all", label: "Все статусы" },
            { value: "ACTIVE", label: "ACTIVE" },
            { value: "INACTIVE", label: "INACTIVE" },
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
            <SelectItem value="INACTIVE">INACTIVE</SelectItem>
          </SelectContent>
        </Select>
      </PageToolbar>

      <DataTable
        columns={columns}
        data={promoCodes.data?.items ?? []}
        isLoading={promoCodes.isLoading}
        isError={promoCodes.isError}
        errorMessage="Не удалось получить промокоды."
        emptyMessage="Промокоды не найдены."
      />
      <DataTablePagination page={page} pageCount={totalPages} onPageChange={setPage} />
    </AppShell>
  );
}
