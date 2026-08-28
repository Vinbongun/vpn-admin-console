"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsRegistrarAccount } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CreateRegistrarAccountDialog } from "@/features/vps-registrars/create-registrar-account-dialog";
import { PaymentMethodsPanel } from "@/features/vps-registrars/payment-methods-panel";
import { RotateRegistrarCredentialsDialog } from "@/features/vps-registrars/rotate-registrar-credentials-dialog";
import { TariffCatalogPanel } from "@/features/vps-registrars/tariff-catalog-panel";
import { can } from "@/lib/access-control";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formatBalance(account: VpsRegistrarAccount) {
  if (account.balanceCents == null || !account.balanceCurrency) return "баланс неизвестен";
  return `${(account.balanceCents / 100).toFixed(2)} ${account.balanceCurrency}`;
}

function AccountCard({ account, selected, onSelect, mayWrite }: { account: VpsRegistrarAccount; selected: boolean; onSelect: () => void; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const syncBalanceMutation = useMutation({
    mutationFn: () => adminApi.syncVpsRegistrarBalance(account.id),
    onSuccess: async () => {
      toast.success("Баланс обновлён.");
      await queryClient.invalidateQueries({ queryKey: ["admin-vps-registrar-accounts"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось обновить баланс."),
  });

  return (
    <Card className={selected ? "border-primary" : undefined} onClick={onSelect} role="button" tabIndex={0}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {account.code}
          <Badge variant="outline">{account.status}</Badge>
        </CardTitle>
        <CardDescription>{formatBalance(account)}</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <Button size="sm" variant="outline" disabled={syncBalanceMutation.isPending} onClick={() => syncBalanceMutation.mutate()}>
              {syncBalanceMutation.isPending && <Spinner />}
              Обновить баланс
            </Button>
            {mayWrite && <RotateRegistrarCredentialsDialog accountId={account.id} accountCode={account.code} />}
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

export function VpsRegistrarsPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>();

  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "vps_registrar.write");
  const accounts = useQuery({ queryKey: ["admin-vps-registrar-accounts"], queryFn: adminApi.listVpsRegistrarAccounts, retry: false });
  const selectedAccount = accounts.data?.find((account) => account.id === selectedAccountId) ?? accounts.data?.[0];

  return (
    <AppShell>
      <PageHeader
        title="Регистраторы VPS"
        description="Аккаунты QWINS для покупки серверов — не путать с регистраторами доменов, это другая сущность"
        actions={mayWrite && <CreateRegistrarAccountDialog />}
      />

      {accounts.isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : accounts.isError ? (
        <p className="text-sm text-destructive">Не удалось получить список аккаунтов.</p>
      ) : !accounts.data || accounts.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ни одного аккаунта регистратора VPS не настроено.</p>
      ) : (
        <>
          <div className="grid gap-4 @lg/main:grid-cols-2">
            {accounts.data.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                selected={account.id === selectedAccount?.id}
                onSelect={() => setSelectedAccountId(account.id)}
                mayWrite={mayWrite}
              />
            ))}
          </div>

          {selectedAccount && (
            <>
              <PaymentMethodsPanel accountId={selectedAccount.id} mayWrite={mayWrite} />
              <TariffCatalogPanel accountId={selectedAccount.id} mayWrite={mayWrite} />
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
