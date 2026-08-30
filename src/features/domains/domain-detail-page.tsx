"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { can } from "@/lib/access-control";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function AddDnsRecordDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <PlusIcon />
        Добавить DNS-запись
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>DNS-провайдер ещё не подключён</DialogTitle>
          <DialogDescription>
            Porkbun DNS выбран как DNS-провайдер платформы, но технически ещё не подключён на бэкенде. Управление DNS-записями станет доступно здесь после
            того, как эта интеграция будет реализована — отдельная, ещё не запущенная задача.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" />}>Понятно</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DomainDetailPage({ domainId }: { domainId: string }) {
  const queryClient = useQueryClient();
  const [internalLabel, setInternalLabel] = useState("");
  const [labelTouched, setLabelTouched] = useState(false);

  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "domains.write");
  const domain = useQuery({ queryKey: ["admin-domain", domainId], queryFn: () => adminApi.getDomain(domainId), retry: false });
  const dnsRecords = useQuery({ queryKey: ["admin-domain-dns-records", domainId], queryFn: () => adminApi.listDomainDnsRecords(domainId), retry: false });
  const sources = useQuery({ queryKey: ["admin-infrastructure-sources"], queryFn: adminApi.listControlPlaneSources, retry: false });
  const sourceNameById = new Map((sources.data ?? []).map((source) => [source.id, source.code]));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-domain", domainId] });

  const autoRenewMutation = useMutation({
    mutationFn: (enabled: boolean) => adminApi.setDomainAutoRenew(domainId, enabled),
    onSuccess: refresh,
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось изменить авто-продление."),
  });
  const syncMutation = useMutation({
    mutationFn: () => adminApi.syncDomain(domainId),
    onSuccess: async () => {
      toast.success("Домен синхронизирован с регистратором.");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось синхронизировать домен."),
  });
  const renewMutation = useMutation({
    mutationFn: () => adminApi.renewDomain(domainId),
    onSuccess: async (result) => {
      if (result.status === "SUCCEEDED") toast.success(`Домен ${result.fqdn} продлён.`);
      else toast.error(`Не удалось продлить ${result.fqdn}${result.errorMessage ? `: ${result.errorMessage}` : ""}`);
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось продлить домен."),
  });
  const unlinkMutation = useMutation({
    mutationFn: () => adminApi.unlinkDomain(domainId),
    onSuccess: async () => {
      toast.success("Домен отвязан от панели/ноды.");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось отвязать домен."),
  });
  const archiveMutation = useMutation({
    mutationFn: () => adminApi.archiveDomain(domainId),
    onSuccess: async () => {
      toast.success("Домен перемещён в архив.");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось архивировать домен."),
  });
  const labelMutation = useMutation({
    mutationFn: () => adminApi.updateDomainMetadata(domainId, { internalLabel }),
    onSuccess: async () => {
      toast.success("Внутренняя метка сохранена.");
      setLabelTouched(false);
      await refresh();
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось сохранить внутреннюю метку."),
  });

  const data = domain.data;
  if (data && !labelTouched) {
    const wanted = data.internalLabel ?? "";
    if (wanted !== internalLabel) setInternalLabel(wanted);
  }

  return (
    <AppShell>
      <Button size="sm" variant="ghost" render={<Link href="/infrastructure/domains" />} nativeButton={false} className="-ml-2.5 self-start">
        <ArrowLeftIcon />
        Назад
      </Button>

      {domain.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : domain.isError || !data ? (
        <ErrorState description="Не удалось получить карточку домена." />
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-lg font-semibold tracking-tight">{data.fqdn}</h1>
                <StatusBadge status={data.status} />
                {data.archivedAt && <Badge variant="outline">В архиве</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {data.id} · куплен {formatDate(data.createdAt)}
              </p>
            </div>
            {mayWrite && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
                  {syncMutation.isPending && <Spinner />}
                  Синхронизировать
                </Button>
                <Button size="sm" variant="outline" disabled={renewMutation.isPending} onClick={() => renewMutation.mutate()}>
                  {renewMutation.isPending && <Spinner />}
                  Продлить
                </Button>
                {data.controlPlaneSourceId && (
                  <Button size="sm" variant="outline" disabled={unlinkMutation.isPending} onClick={() => unlinkMutation.mutate()}>
                    {unlinkMutation.isPending && <Spinner />}
                    Отвязать
                  </Button>
                )}
                {!data.archivedAt && (
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="outline" disabled={archiveMutation.isPending}>
                        {archiveMutation.isPending && <Spinner />}
                        В архив
                      </Button>
                    }
                    title="Архивировать домен?"
                    description={`«${data.fqdn}» будет отвязан от панели/ноды и перемещён в архив локально. Регистрация домена у регистратора не затрагивается и не освобождается.`}
                    confirmLabel="В архив"
                    isPending={archiveMutation.isPending}
                    onConfirm={() => archiveMutation.mutate()}
                  />
                )}
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Основные данные</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Срок действия" value={formatDate(data.expiresAt)} />
                <Field
                  label="Авто-продление"
                  value={
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={data.autoRenew}
                        disabled={!mayWrite || autoRenewMutation.isPending}
                        onCheckedChange={(checked) => autoRenewMutation.mutate(checked)}
                      />
                      <span>{data.autoRenew ? "включено" : "выключено"}</span>
                    </div>
                  }
                />
                <Field label="Режим DNS" value={data.dnsMode} />
                <Field
                  label="Привязка к панели/серверу"
                  value={
                    data.controlPlaneSourceId ? (
                      <Link href={`/infrastructure/panels-and-servers?source=${data.controlPlaneSourceId}`} className="underline">
                        {sourceNameById.get(data.controlPlaneSourceId) ?? data.controlPlaneSourceId}
                      </Link>
                    ) : data.vpsInstanceId ? (
                      <Link href={`/infrastructure/vps/${data.vpsInstanceId}`} className="underline">
                        VPS без панели
                      </Link>
                    ) : (
                      "Не привязан"
                    )
                  }
                />
                <Field label="Ref у регистратора" value={data.registrarDomainRef ?? "—"} />
                {data.archivedAt && <Field label="В архиве с" value={formatDate(data.archivedAt)} />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Внутренняя метка</CardTitle>
              <CardDescription>Видно только в этой админке, никогда не передаётся регистратору, в DNS или WHOIS</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label="Внутренняя метка"
                  placeholder="Например panel-fr-01"
                  className="max-w-72"
                  disabled={!mayWrite}
                  value={internalLabel}
                  onChange={(event) => {
                    setInternalLabel(event.target.value);
                    setLabelTouched(true);
                  }}
                />
                {mayWrite && (
                  <Button size="sm" disabled={labelMutation.isPending || internalLabel === (data.internalLabel ?? "")} onClick={() => labelMutation.mutate()}>
                    {labelMutation.isPending && <Spinner />}
                    Сохранить
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>DNS-записи</CardTitle>
              <CardDescription>Локальный кэш записей — пуст, пока DNS-провайдер не подключён на бэкенде</CardDescription>
            </CardHeader>
            <CardContent>
              {dnsRecords.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : dnsRecords.isError ? (
                <ErrorState description="Не удалось получить DNS-записи." />
              ) : !dnsRecords.data || dnsRecords.data.length === 0 ? (
                <EmptyState title="DNS-записей нет" description="Появятся здесь после подключения DNS-провайдера" action={mayWrite && <AddDnsRecordDialog />} />
              ) : (
                <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">{JSON.stringify(dnsRecords.data, null, 2)}</pre>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
