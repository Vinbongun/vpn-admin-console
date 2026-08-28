"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { TagIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { Domain, DomainStatus } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { GenerateDomainsDialog } from "@/features/domains/generate-domains-dialog";
import { can } from "@/lib/access-control";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

const statuses: DomainStatus[] = ["PENDING", "ACTIVE", "EXPIRED", "ARCHIVED"];

export function DomainsListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<DomainStatus | "all">("all");

  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "domains.write");
  const domains = useQuery({
    queryKey: ["admin-domains", statusFilter],
    queryFn: () => adminApi.listDomains(statusFilter !== "all" ? { status: statusFilter } : {}),
    retry: false,
  });
  const sources = useQuery({ queryKey: ["admin-infrastructure-sources"], queryFn: adminApi.listControlPlaneSources, retry: false });
  const sourceNameById = new Map((sources.data ?? []).map((source) => [source.id, source.code]));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-domains"] });

  const autoRenewMutation = useMutation({
    mutationFn: (input: { id: string; enabled: boolean }) => adminApi.setDomainAutoRenew(input.id, input.enabled),
    onSuccess: refresh,
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось изменить авто-продление."),
  });
  const syncMutation = useMutation({
    mutationFn: (id: string) => adminApi.syncDomain(id),
    onSuccess: async () => {
      toast.success("Домен синхронизирован с регистратором.");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось синхронизировать домен."),
  });
  const renewMutation = useMutation({
    mutationFn: (id: string) => adminApi.renewDomain(id),
    onSuccess: async (result) => {
      if (result.status === "SUCCEEDED") toast.success(`Домен ${result.fqdn} продлён.`);
      else toast.error(`Не удалось продлить ${result.fqdn}${result.errorMessage ? `: ${result.errorMessage}` : ""}`);
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось продлить домен."),
  });
  const unlinkMutation = useMutation({
    mutationFn: (id: string) => adminApi.unlinkDomain(id),
    onSuccess: async () => {
      toast.success("Домен отвязан от панели/ноды.");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось отвязать домен."),
  });
  const archiveMutation = useMutation({
    mutationFn: (id: string) => adminApi.archiveDomain(id),
    onSuccess: async () => {
      toast.success("Домен перемещён в архив.");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось архивировать домен."),
  });

  const columns: ColumnDef<Domain>[] = [
    { accessorKey: "fqdn", header: "Домен", cell: ({ row }) => <span className="font-medium">{row.original.fqdn}</span> },
    {
      id: "status",
      header: "Статус",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={row.original.status} />
          {row.original.archivedAt && <Badge variant="outline">В архиве</Badge>}
        </div>
      ),
    },
    { id: "expiresAt", header: "Срок действия", cell: ({ row }) => formatDate(row.original.expiresAt) },
    {
      id: "autoRenew",
      header: "Авто-продление",
      cell: ({ row }) => (
        <div onClick={(event) => event.stopPropagation()}>
          <Switch
            checked={row.original.autoRenew}
            disabled={!mayWrite || (autoRenewMutation.isPending && autoRenewMutation.variables?.id === row.original.id)}
            onCheckedChange={(checked) => autoRenewMutation.mutate({ id: row.original.id, enabled: checked })}
          />
        </div>
      ),
    },
    {
      id: "source",
      header: "Привязка",
      cell: ({ row }) =>
        row.original.controlPlaneSourceId ? (sourceNameById.get(row.original.controlPlaneSourceId) ?? row.original.controlPlaneSourceId) : "Не привязан",
    },
    ...(mayWrite
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }: { row: { original: Domain } }) => {
              const domain = row.original;
              const isSyncing = syncMutation.isPending && syncMutation.variables === domain.id;
              const isRenewing = renewMutation.isPending && renewMutation.variables === domain.id;
              const isUnlinking = unlinkMutation.isPending && unlinkMutation.variables === domain.id;
              const isArchiving = archiveMutation.isPending && archiveMutation.variables === domain.id;
              return (
                <div className="flex flex-wrap justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                  <Button size="sm" variant="outline" disabled={isSyncing} onClick={() => syncMutation.mutate(domain.id)}>
                    {isSyncing && <Spinner />}
                    Синхронизировать
                  </Button>
                  <Button size="sm" variant="outline" disabled={isRenewing} onClick={() => renewMutation.mutate(domain.id)}>
                    {isRenewing && <Spinner />}
                    Продлить
                  </Button>
                  {domain.controlPlaneSourceId && (
                    <Button size="sm" variant="outline" disabled={isUnlinking} onClick={() => unlinkMutation.mutate(domain.id)}>
                      {isUnlinking && <Spinner />}
                      Отвязать
                    </Button>
                  )}
                  {!domain.archivedAt && (
                    <ConfirmDialog
                      trigger={
                        <Button size="sm" variant="outline" disabled={isArchiving}>
                          {isArchiving && <Spinner />}
                          В архив
                        </Button>
                      }
                      title="Архивировать домен?"
                      description={`«${domain.fqdn}» будет отвязан от панели/ноды и перемещён в архив локально. Регистрация домена у регистратора не затрагивается и не освобождается.`}
                      confirmLabel="В архив"
                      isPending={isArchiving}
                      onConfirm={() => archiveMutation.mutate(domain.id)}
                    />
                  )}
                </div>
              );
            },
          } satisfies ColumnDef<Domain>,
        ]
      : []),
  ];

  const stats = domains.data?.stats ?? {};

  return (
    <AppShell>
      <PageHeader
        title="Домены"
        description="Домены, купленные через регистратора (сейчас — Porkbun, только sandbox), и их привязка к панелям/нодам"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" render={<Link href="/infrastructure/domains/zone-pricing" />} nativeButton={false}>
              <TagIcon />
              Цены по зонам
            </Button>
            {mayWrite && <GenerateDomainsDialog onPurchased={refresh} />}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {statuses.map((status) => (
          <StatCard key={status} label={status} value={domains.isLoading ? "…" : domains.isError ? "—" : (stats[status] ?? 0)} />
        ))}
      </div>

      <div className="max-w-64">
        <Select
          items={[{ value: "all", label: "Все статусы" }, ...statuses.map((status) => ({ value: status, label: status }))]}
          value={statusFilter}
          onValueChange={(value) => setStatusFilter((value as typeof statusFilter) ?? "all")}
        >
          <SelectTrigger aria-label="Статус">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Статус</SelectLabel>
              <SelectItem value="all">Все статусы</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={domains.data?.domains ?? []}
        isLoading={domains.isLoading}
        isError={domains.isError}
        errorMessage="Не удалось получить список доменов."
        emptyMessage="Домены не найдены."
        onRowClick={(domain) => router.push(`/infrastructure/domains/${domain.id}`)}
      />
    </AppShell>
  );
}
