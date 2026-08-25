"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { adminApi } from "@/api/client";
import type { ReferralPartner } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { PartnerDialog } from "@/features/referrals/partner-dialog";
import { can } from "@/lib/access-control";

export function PartnersPage() {
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "finance.write");
  const partners = useQuery({ queryKey: ["admin-referral-partners"], queryFn: () => adminApi.listReferralPartners(), retry: false });

  const columns: ColumnDef<ReferralPartner>[] = [
    { accessorKey: "name", header: "Имя" },
    { id: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "createdAt", header: "Создан", cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("ru-RU") },
    ...(mayWrite
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }: { row: { original: ReferralPartner } }) => (
              <div className="text-right">
                <PartnerDialog partner={row.original} trigger={<Button size="sm" variant="outline">Изменить</Button>} />
              </div>
            ),
          } satisfies ColumnDef<ReferralPartner>,
        ]
      : []),
  ];

  return (
    <AppShell>
      <PageHeader title="Список рефералов" description="Партнёры, которым платформа платит за приведённых клиентов" actions={mayWrite && <PartnerDialog />} />
      <DataTable
        columns={columns}
        data={partners.data ?? []}
        isLoading={partners.isLoading}
        isError={partners.isError}
        errorMessage="Не удалось получить список рефералов."
        emptyMessage="Рефералов пока нет."
      />
    </AppShell>
  );
}
