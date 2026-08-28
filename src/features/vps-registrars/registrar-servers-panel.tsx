"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { RegistrarServerSummary } from "@/api/types";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formatMoney(cents?: number | null, currency?: string | null) {
  return cents != null && currency ? `${(cents / 100).toFixed(2)} ${currency}` : "—";
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

export function RegistrarServersPanel({ accountId, mayWrite }: { accountId: string; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const [importingItemId, setImportingItemId] = useState<string>();
  const servers = useQuery({ queryKey: ["admin-vps-registrar-servers", accountId], queryFn: () => adminApi.listVpsRegistrarServers(accountId), retry: false });

  const importMutation = useMutation({
    mutationFn: (itemId: string) => adminApi.importVpsRegistrarServer(accountId, itemId),
    onMutate: (itemId) => setImportingItemId(itemId),
    onSuccess: async () => {
      toast.success("Сервер импортирован.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-vps-registrar-servers", accountId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-vps-instances"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось импортировать сервер."),
    onSettled: () => setImportingItemId(undefined),
  });

  const columns: ColumnDef<RegistrarServerSummary>[] = [
    { id: "hostname", header: "Хост", cell: ({ row }) => row.original.hostname ?? row.original.ip ?? row.original.itemId },
    { id: "ip", header: "IP", cell: ({ row }) => row.original.ip ?? "—" },
    { id: "status", header: "Статус", cell: ({ row }) => <Badge variant="outline">{row.original.statusText}</Badge> },
    { id: "datacenter", header: "Локация", cell: ({ row }) => row.original.datacenterName ?? "—" },
    { id: "cost", header: "Стоимость", cell: ({ row }) => formatMoney(row.original.costCents, row.original.currency) },
    { id: "expireDate", header: "Истекает", cell: ({ row }) => formatDate(row.original.expireDate) },
    ...(mayWrite
      ? [
          {
            id: "actions",
            header: "",
            cell: ({ row }: { row: { original: RegistrarServerSummary } }) => {
              const server = row.original;
              if (server.imported) return <Badge variant="outline">Импортирован</Badge>;
              return (
                <Button size="sm" variant="outline" disabled={importMutation.isPending} onClick={() => importMutation.mutate(server.itemId)}>
                  {importingItemId === server.itemId && <Spinner />}
                  Импортировать
                </Button>
              );
            },
          } satisfies ColumnDef<RegistrarServerSummary>,
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Серверы на регистраторе</CardTitle>
        <CardDescription>Все серверы аккаунта на стороне регистратора, включая купленные не через этот кабинет</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={servers.data ?? []}
          isLoading={servers.isLoading}
          isError={servers.isError}
          errorMessage="Не удалось получить список серверов."
          emptyMessage="Серверов на регистраторе нет."
        />
      </CardContent>
    </Card>
  );
}
