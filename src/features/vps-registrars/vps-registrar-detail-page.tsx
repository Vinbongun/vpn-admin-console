"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { PaymentMethodsPanel } from "@/features/vps-registrars/payment-methods-panel";
import { RegistrarServersPanel } from "@/features/vps-registrars/registrar-servers-panel";
import { RotateRegistrarCredentialsDialog } from "@/features/vps-registrars/rotate-registrar-credentials-dialog";
import { TariffCatalogPanel } from "@/features/vps-registrars/tariff-catalog-panel";
import { can } from "@/lib/access-control";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formatBalance(balanceCents?: number | null, balanceCurrency?: string | null) {
  return balanceCents != null && balanceCurrency ? `${(balanceCents / 100).toFixed(2)} ${balanceCurrency}` : "—";
}

export function VpsRegistrarDetailPage({ accountId }: { accountId: string }) {
  const queryClient = useQueryClient();
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "vps_registrar.write");
  const accounts = useQuery({ queryKey: ["admin-vps-registrar-accounts"], queryFn: adminApi.listVpsRegistrarAccounts, retry: false });
  const account = accounts.data?.find((row) => row.id === accountId);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-vps-registrar-accounts"] });

  const syncBalanceMutation = useMutation({
    mutationFn: () => adminApi.syncVpsRegistrarBalance(accountId),
    onSuccess: async () => {
      toast.success("Баланс обновлён.");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось обновить баланс."),
  });

  const activateMutation = useMutation({
    mutationFn: () => adminApi.activateVpsRegistrarAccount(accountId),
    onSuccess: async () => {
      toast.success(`«${account?.code}» теперь активный аккаунт для ${account?.providerType}.`);
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось сделать аккаунт активным."),
  });

  return (
    <AppShell>
      <Button size="sm" variant="ghost" render={<Link href="/infrastructure/vps-purchase" />} nativeButton={false} className="-ml-2.5 self-start">
        <ArrowLeftIcon />
        Назад
      </Button>

      {accounts.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : accounts.isError || !account ? (
        <ErrorState description="Не удалось получить карточку аккаунта регистратора." />
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-lg font-semibold tracking-tight">{account.code}</h1>
                <StatusBadge status={account.status} />
                {account.status === "ACTIVE" && <Badge variant="outline">Активный для {account.providerType}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {account.providerType} · баланс {formatBalance(account.balanceCents, account.balanceCurrency)}
              </p>
            </div>
            {mayWrite && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={syncBalanceMutation.isPending} onClick={() => syncBalanceMutation.mutate()}>
                  {syncBalanceMutation.isPending && <Spinner />}
                  Обновить баланс
                </Button>
                {account.status !== "ACTIVE" && (
                  <Button size="sm" variant="outline" disabled={activateMutation.isPending} onClick={() => activateMutation.mutate()}>
                    {activateMutation.isPending && <Spinner />}
                    Сделать активным
                  </Button>
                )}
                <RotateRegistrarCredentialsDialog accountId={account.id} accountCode={account.code} />
              </div>
            )}
          </div>

          <RegistrarServersPanel accountId={account.id} mayWrite={mayWrite} />
          <PaymentMethodsPanel accountId={account.id} mayWrite={mayWrite} />
          <TariffCatalogPanel accountId={account.id} mayWrite={mayWrite} />
        </div>
      )}
    </AppShell>
  );
}
