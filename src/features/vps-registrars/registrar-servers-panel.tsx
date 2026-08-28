"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { RegistrarServerSummary } from "@/api/types";
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

function ServerCard({ server, action }: { server: RegistrarServerSummary; action?: React.ReactNode }) {
  return (
    <Card className="gap-2 p-4">
      <p className="text-sm font-medium">{server.hostname ?? server.ip ?? server.itemId}</p>
      {server.ip && server.hostname && <p className="text-xs text-muted-foreground">{server.ip}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{server.statusText}</Badge>
        {server.datacenterName && <span className="text-xs text-muted-foreground">{server.datacenterName}</span>}
      </div>
      <p className="text-xs text-muted-foreground">
        {formatMoney(server.costCents, server.currency)} · истекает {formatDate(server.expireDate)}
      </p>
      {action && <div className="mt-1">{action}</div>}
    </Card>
  );
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Серверы на регистраторе</CardTitle>
        <CardDescription>Все серверы аккаунта на стороне регистратора, включая купленные не через этот кабинет</CardDescription>
      </CardHeader>
      <CardContent>
        {servers.isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка…</p>
        ) : servers.isError ? (
          <p className="text-sm text-destructive">Не удалось получить список серверов.</p>
        ) : !servers.data || servers.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Серверов на регистраторе нет.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {servers.data.map((server) => (
              <ServerCard
                key={server.itemId}
                server={server}
                action={
                  server.imported ? (
                    <Badge variant="outline">Импортирован</Badge>
                  ) : (
                    mayWrite && (
                      <Button size="sm" variant="outline" disabled={importMutation.isPending} onClick={() => importMutation.mutate(server.itemId)}>
                        {importingItemId === server.itemId && <Spinner />}
                        Импортировать
                      </Button>
                    )
                  )
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
