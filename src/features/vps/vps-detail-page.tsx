"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, ChevronDownIcon, RefreshCwIcon, ServerIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsHistoryEntry, VpsInstanceDetail } from "@/api/types";
import { AppShell } from "@/components/app-shell";
import { CountryFlag } from "@/components/country-flag";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Сервер регистратора</CardTitle>
        <CardDescription>Куплен через регистратора — действия над услугой. История изменений и отчёты — в карточке ниже.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={rebootMutation.isPending} onClick={() => rebootMutation.mutate()}>
          {rebootMutation.isPending && <Spinner />}
          Перезагрузить
        </Button>
        <ChangePasswordDialog registrarAccountId={registrarAccountId} itemId={itemId} />
      </CardContent>
    </Card>
  );
}

/** Объединяет "Последние отчёты" (наши ansible-задачи) и "История" (лог регистратора) в одну
 *  карточку с вкладками — раньше история изменений была зарыта внутри QwinsServerCard вперемешку
 *  с кнопками действий, а отчёты жили в отдельной карточке ниже. Для MANUAL-серверов вкладки
 *  истории нет вообще (регистратор её не ведёт) — тогда рендерится просто список отчётов без Tabs. */
function ReportsHistoryCard({ vps, registrarAccountId, itemId }: { vps: VpsInstanceDetail; registrarAccountId?: string | null; itemId?: string | null }) {
  const hasHistory = Boolean(registrarAccountId && itemId);
  const history = useQuery({
    queryKey: ["admin-vps-server-history", registrarAccountId, itemId],
    queryFn: () => adminApi.getVpsServerHistory(registrarAccountId!, itemId!),
    retry: false,
    enabled: hasHistory,
  });
  const sortedHistory = [...(history.data ?? [])].sort((a, b) => b.changeDate.localeCompare(a.changeDate));

  const reportsContent =
    !vps.latestReports || vps.latestReports.length === 0 ? (
      <p className="text-sm text-muted-foreground">Отчётов пока нет.</p>
    ) : (
      <div className="flex flex-col gap-2">
        {vps.latestReports.map((report, index) => (
          <Collapsible key={index}>
            <CollapsibleTrigger
              render={<button type="button" className="flex w-full items-center justify-between gap-2 rounded-md border p-2.5 text-left text-sm hover:bg-accent" />}
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
    );

  const historyContent = history.isLoading ? (
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
  );

  if (!hasHistory) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Последние отчёты</CardTitle>
          <CardDescription>Последний отчёт по каждому типу задачи — формат зависит от типа, не унифицирован</CardDescription>
        </CardHeader>
        <CardContent>{reportsContent}</CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Отчёты и история</CardTitle>
        <CardDescription>Отчёты наших задач автоматизации и история изменений услуги у регистратора</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="reports">
          <TabsList>
            <TabsTrigger value="reports">Отчёты</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>
          <TabsContent value="reports" className="mt-3">
            {reportsContent}
          </TabsContent>
          <TabsContent value="history" className="mt-3">
            {historyContent}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function VpsDetailPage({ vpsId }: { vpsId: string }) {
  const queryClient = useQueryClient();
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "vps.write");
  const vps = useQuery({ queryKey: ["admin-vps-instance", vpsId], queryFn: () => adminApi.getVpsInstance(vpsId), retry: false });
  const data = vps.data;
  const registrarAccounts = useQuery({ queryKey: ["admin-vps-registrar-accounts"], queryFn: adminApi.listVpsRegistrarAccounts, retry: false, enabled: Boolean(data?.registrarAccountId) });
  const registrarAccount = registrarAccounts.data?.find((account) => account.id === data?.registrarAccountId);

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
        (() => {
          const hasRegistrarCard = data.providerType !== "MANUAL" && Boolean(data.registrarAccountId) && Boolean(data.registrarItemRef);
          return (
            <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-2">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 lg:col-span-2">
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

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Основные данные</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="SSH" value={`${data.sshUser}@${data.host}:${data.sshPort}`} />
                    <Field label="Способ добавления" value={data.providerType === "MANUAL" ? "Вручную" : "API"} />
                    {data.registrarAccountId && (
                      <Field
                        label="Регистратор"
                        value={
                          registrarAccount ? (
                            <Link href={`/infrastructure/vps-purchase/${data.registrarAccountId}`} className="underline">
                              {registrarAccount.code}
                            </Link>
                          ) : (
                            "—"
                          )
                        }
                      />
                    )}
                    <Field label="Последняя проверка здоровья" value={formatDate(data.lastHealthCheckAt)} />
                    <Field label="Дата последнего бэкапа" value={formatDate(data.latestReports?.find((report) => report.jobType === "BACKUP")?.createdAt)} />
                    <Field label="Домен панели" value={data.domainFqdn ?? "—"} />
                    <Field
                      label="Локация"
                      value={
                        // datacenterName только у API-купленных серверов - у MANUAL его нет
                        // никогда, даже после того как staff вручную задал страну ниже.
                        (data.datacenterName ?? data.datacenterCountryName) ? (
                          <span className="flex items-center gap-1.5">
                            <CountryFlag code={data.datacenterCountryCode} />
                            {data.datacenterName ?? data.datacenterCountryName}
                          </span>
                        ) : (
                          "—"
                        )
                      }
                    />
                    <Field label="Стоимость покупки" value={formatMoney(data.purchaseCostCents, data.currency)} />
                    <Field label="Дата покупки" value={formatDate(data.purchasedAt)} />
                    <Field label="Дата истечения" value={data.expireDate ? formatDate(data.expireDate) : "—"} />
                    <Field label="Авто-продление" value={data.autoProlong ? "включено" : "выключено"} />
                    {data.archivedAt && <Field label="В архиве с" value={formatDate(data.archivedAt)} />}
                  </div>
                </CardContent>
              </Card>

              <div className={hasRegistrarCard ? undefined : "lg:col-span-2"}>
                <PanelProtocolCard vps={data} mayWrite={mayWrite} />
              </div>

              {hasRegistrarCard && data.registrarAccountId && data.registrarItemRef && (
                <QwinsServerCard registrarAccountId={data.registrarAccountId} itemId={data.registrarItemRef} />
              )}

              <VpsJobsCard vps={data} mayWrite={mayWrite} />

              <ReportsHistoryCard vps={data} registrarAccountId={data.registrarAccountId} itemId={data.registrarItemRef} />

              <div className="lg:col-span-2">
                <DangerZoneCard vps={data} mayWrite={mayWrite} />
              </div>
            </div>
          );
        })()
      )}
    </AppShell>
  );
}
