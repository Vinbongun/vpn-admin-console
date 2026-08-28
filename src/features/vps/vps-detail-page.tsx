"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, ChevronDownIcon, RefreshCwIcon, ServerIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsHistoryEntry } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { DangerZoneCard } from "@/features/vps/danger-zone-card";
import { EditPurchaseInfoDialog } from "@/features/vps/edit-purchase-info-dialog";
import { PanelProtocolCard } from "@/features/vps/panel-protocol-card";
import { VpsJobsCard } from "@/features/vps/vps-jobs-card";
import { can } from "@/lib/access-control";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

function formatMoney(cents?: number | null, currency?: string | null) {
  return cents != null && currency ? `${(cents / 100).toFixed(2)} ${currency}` : "—";
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function ChangePasswordDialog({ registrarAccountId, itemId }: { registrarAccountId: string; itemId: string }) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => adminApi.changeVpsServerPassword(registrarAccountId, itemId, { newPassword }),
    onSuccess: () => {
      toast.success("Пароль сервера изменён.");
      setOpen(false);
      setNewPassword("");
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось сменить пароль."),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setNewPassword("");
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Сменить пароль</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Сменить пароль сервера</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="vps-new-password">Новый пароль</Label>
          <Input id="vps-new-password" type="text" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button disabled={!newPassword || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            Сменить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QwinsServerCard({ registrarAccountId, itemId }: { registrarAccountId: string; itemId: string }) {
  const rebootMutation = useMutation({
    mutationFn: () => adminApi.rebootVpsServer(registrarAccountId, itemId),
    onSuccess: () => toast.success("Перезагрузка запрошена."),
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось перезагрузить сервер."),
  });
  const history = useQuery({
    queryKey: ["admin-vps-server-history", registrarAccountId, itemId],
    queryFn: () => adminApi.getVpsServerHistory(registrarAccountId, itemId),
    retry: false,
  });
  const sortedHistory = [...(history.data ?? [])].sort((a, b) => b.changeDate.localeCompare(a.changeDate));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Сервер регистратора</CardTitle>
        <CardDescription>Куплен через регистратора — действия и история изменений услуги</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={rebootMutation.isPending} onClick={() => rebootMutation.mutate()}>
            {rebootMutation.isPending && <Spinner />}
            Перезагрузить
          </Button>
          <ChangePasswordDialog registrarAccountId={registrarAccountId} itemId={itemId} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">История изменений</p>
          {history.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : history.isError ? (
            <ErrorState description="Не удалось получить историю сервера." />
          ) : sortedHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">История пуста.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedHistory.map((entry: VpsHistoryEntry, index) => (
                <div key={index} className="rounded-md border p-2.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>{entry.description}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(entry.changeDate)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.user}
                    {entry.ip ? ` · ${entry.ip}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function VpsDetailPage({ vpsId }: { vpsId: string }) {
  const queryClient = useQueryClient();
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "vps.write");
  const mayDecommission = can(staff.data, "vps.decommission");
  const vps = useQuery({ queryKey: ["admin-vps-instance", vpsId], queryFn: () => adminApi.getVpsInstance(vpsId), retry: false });
  const data = vps.data;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-vps-instance", vpsId] });

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" render={<Link href="/infrastructure/panels-and-servers" />} nativeButton={false} className="-ml-2.5 self-start">
          <ArrowLeftIcon />
          Назад
        </Button>
        <Button size="icon-sm" variant="ghost" title="Обновить статус" onClick={refresh}>
          <RefreshCwIcon />
        </Button>
      </div>

      {vps.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : vps.isError || !data ? (
        <ErrorState description="Не удалось получить карточку VPS." />
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <div>
              <div className="flex items-center gap-2">
                <ServerIcon className="size-4 text-muted-foreground" />
                <h1 className="font-heading text-lg font-semibold tracking-tight">{data.code}</h1>
                <StatusBadge status={data.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {data.host} · {data.id}
              </p>
            </div>
            {mayWrite && <EditPurchaseInfoDialog vps={data} />}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Основные данные</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="SSH" value={`${data.sshUser}@${data.host}:${data.sshPort}`} />
                <Field label="Способ добавления" value={data.providerType === "MANUAL" ? "Вручную" : `Через API (${data.providerType})`} />
                <Field label="Последняя проверка здоровья" value={formatDate(data.lastHealthCheckAt)} />
                <Field label="Домен панели" value={data.domainFqdn ?? "—"} />
                <Field label="Стоимость покупки" value={formatMoney(data.purchaseCostCents, data.currency)} />
                <Field label="Дата покупки" value={formatDate(data.purchasedAt)} />
                <Field label="Дата истечения" value={data.expireDate ? formatDate(data.expireDate) : "—"} />
                <Field label="Авто-продление" value={data.autoProlong ? "включено" : "выключено"} />
                {data.archivedAt && <Field label="В архиве с" value={formatDate(data.archivedAt)} />}
              </div>
            </CardContent>
          </Card>

          <PanelProtocolCard vps={data} mayWrite={mayWrite} />

          <VpsJobsCard vps={data} mayWrite={mayWrite} />

          <Card>
            <CardHeader>
              <CardTitle>Последние отчёты</CardTitle>
              <CardDescription>Последний отчёт по каждому типу задачи — формат зависит от типа, не унифицирован</CardDescription>
            </CardHeader>
            <CardContent>
              {!data.latestReports || data.latestReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">Отчётов пока нет.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.latestReports.map((report, index) => (
                    <Collapsible key={index}>
                      <CollapsibleTrigger
                        render={
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-2 rounded-md border p-2.5 text-left text-sm hover:bg-accent"
                          />
                        }
                      >
                        <span className="font-medium">{report.jobType}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {formatDate(report.createdAt)}
                          <ChevronDownIcon className="size-4" />
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <pre className="mt-2 overflow-x-auto rounded-md border bg-muted p-3 text-xs">{JSON.stringify(report.reportPayload, null, 2)}</pre>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {data.providerType !== "MANUAL" && data.registrarAccountId && data.registrarItemRef && (
            <QwinsServerCard registrarAccountId={data.registrarAccountId} itemId={data.registrarItemRef} />
          )}

          <DangerZoneCard vps={data} mayWrite={mayWrite} mayDecommission={mayDecommission} />
        </div>
      )}
    </AppShell>
  );
}
