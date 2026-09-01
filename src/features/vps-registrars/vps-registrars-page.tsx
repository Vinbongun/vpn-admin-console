"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeftIcon, ShoppingCartIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsRegistrarAccount } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateRegistrarAccountDialog } from "@/features/vps-registrars/create-registrar-account-dialog";
import { can } from "@/lib/access-control";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formatBalance(account: VpsRegistrarAccount) {
  if (account.balanceCents == null || !account.balanceCurrency) return "—";
  return `${(account.balanceCents / 100).toFixed(2)} ${account.balanceCurrency}`;
}

function providerCell(account: VpsRegistrarAccount) {
  if (account.providerType === "MANUAL") return account.providerDisplayName ? `Вручную (${account.providerDisplayName})` : "Вручную";
  return account.providerType;
}

export function VpsRegistrarsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "vps_registrar.write");
  const accounts = useQuery({ queryKey: ["admin-vps-registrar-accounts"], queryFn: adminApi.listVpsRegistrarAccounts, retry: false });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const ids = [...selected];
      const failures: { code: string; message: string }[] = [];
      for (const id of ids) {
        try {
          await adminApi.deleteVpsRegistrarAccount(id);
        } catch (error) {
          const code = accounts.data?.find((account) => account.id === id)?.code ?? id;
          failures.push({ code, message: error instanceof ApiError ? apiErrorMessage(error) : "Не удалось удалить" });
        }
      }
      return { total: ids.length, failures };
    },
    onSuccess: async ({ total, failures }) => {
      setSelected(new Set());
      await queryClient.invalidateQueries({ queryKey: ["admin-vps-registrar-accounts"] });
      if (failures.length === 0) {
        toast.success(`Удалено аккаунтов: ${total}.`);
      } else {
        toast.error(`Удалено: ${total - failures.length} из ${total}`, {
          description: failures.map((failure) => `${failure.code}: ${failure.message}`).join("\n"),
        });
      }
    },
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = (accounts.data?.length ?? 0) > 0 && selected.size === accounts.data?.length;

  const columns: ColumnDef<VpsRegistrarAccount>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => setSelected(checked ? new Set((accounts.data ?? []).map((account) => account.id)) : new Set())}
        />
      ),
      cell: ({ row }) => (
        <div onClick={(event) => event.stopPropagation()}>
          <Checkbox checked={selected.has(row.original.id)} onCheckedChange={() => toggle(row.original.id)} />
        </div>
      ),
    },
    { accessorKey: "code", header: "Код", cell: ({ row }) => <span className="font-medium">{row.original.code}</span> },
    { id: "providerType", header: "Регистратор", cell: ({ row }) => providerCell(row.original) },
    { id: "status", header: "Статус", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "balance", header: "Баланс", cell: ({ row }) => formatBalance(row.original) },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.providerType === "MANUAL" ? null : (
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
        actions={
          <div className="flex items-center gap-2">
            {mayWrite && selected.size > 0 && (
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="destructive">
                    <Trash2Icon />
                    Удалить выбранные ({selected.size})
                  </Button>
                }
                title={`Удалить ${selected.size} аккаунт(ов)?`}
                description="Аккаунты с реально привязанными VPS-серверами или историей покупок будут пропущены с ошибкой, остальные удалятся."
                confirmLabel="Удалить"
                isPending={bulkDeleteMutation.isPending}
                onConfirm={() => bulkDeleteMutation.mutate()}
              />
            )}
            {mayWrite && <CreateRegistrarAccountDialog />}
          </div>
        }
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
