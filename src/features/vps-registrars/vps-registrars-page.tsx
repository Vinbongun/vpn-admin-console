"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeftIcon, ShoppingCartIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminApi } from "@/api/client";
import type { VpsRegistrarAccount } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { CreateRegistrarAccountDialog } from "@/features/vps-registrars/create-registrar-account-dialog";
import { can } from "@/lib/access-control";

function formatBalance(account: VpsRegistrarAccount) {
  if (account.balanceCents == null || !account.balanceCurrency) return "—";
  return `${(account.balanceCents / 100).toFixed(2)} ${account.balanceCurrency}`;
}

export function VpsRegistrarsPage() {
  const router = useRouter();
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "vps_registrar.write");
  const accounts = useQuery({ queryKey: ["admin-vps-registrar-accounts"], queryFn: adminApi.listVpsRegistrarAccounts, retry: false });

  const columns: ColumnDef<VpsRegistrarAccount>[] = [
    { accessorKey: "code", header: "Код", cell: ({ row }) => <span className="font-medium">{row.original.code}</span> },
    { accessorKey: "providerType", header: "Регистратор" },
    { id: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "balance", header: "Баланс", cell: ({ row }) => formatBalance(row.original) },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" render={<Link href={`/infrastructure/vps-purchase/${row.original.id}`} />} nativeButton={false}>
            <ShoppingCartIcon />
            Купить VPS
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <Button size="sm" variant="ghost" render={<Link href="/infrastructure/panels-and-servers" />} nativeButton={false} className="-ml-2.5 self-start">
        <ArrowLeftIcon />
        Назад
      </Button>

      <PageHeader
        title="Купить VPS"
        description="Аккаунты для покупки серверов у разных VPS-регистраторов — не путать с регистраторами доменов, это другая сущность"
        actions={mayWrite && <CreateRegistrarAccountDialog />}
      />

      <DataTable
        columns={columns}
        data={accounts.data ?? []}
        isLoading={accounts.isLoading}
        isError={accounts.isError}
        errorMessage="Не удалось получить список аккаунтов."
        emptyMessage="Ни одного аккаунта регистратора VPS не настроено."
        onRowClick={(account) => router.push(`/infrastructure/vps-purchase/${account.id}`)}
      />
    </AppShell>
  );
}
