"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsInstanceDetail } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { InstallRemnawaveNodeDialog } from "@/features/vps/install-remnawave-node-dialog";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function InstallPanelDialog({ vps, alreadyInstalled }: { vps: VpsInstanceDetail; alreadyInstalled: boolean }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => adminApi.installPanelOnVpsInstance(vps.id),
    onSuccess: async () => {
      toast.success(`Задача ${alreadyInstalled ? "переустановки" : "установки"} панели поставлена.`);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-vps-instance", vps.id] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось поставить задачу установки панели."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>{alreadyInstalled ? "Переустановить панель (3x-ui)" : "Установить панель (3x-ui)"}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{alreadyInstalled ? "Переустановить" : "Установить"} панель 3x-ui?</DialogTitle>
          <DialogDescription render={<div />}>
            <ul className="list-disc space-y-1.5 pl-4">
              <li>Панель поднимется на порту 2053 с логином/паролем admin/admin, без TLS/домена — порт и логин не рандомизируются (ограничение образа).</li>
              <li>
                Панель <b>не регистрируется в системе автоматически</b> — после установки нужно зайти по <code>http://&lt;host&gt;:2053</code>, сменить
                пароль, настроить API-доступ и зарегистрировать панель вручную через «+ Добавить панель».
              </li>
              <li>После успешной задачи привязка к панели у VPS останется пустой — это ожидаемо, не ошибка.</li>
              {alreadyInstalled && (
                <li>
                  Повторный запуск безопасен (контейнер не пересоздаётся, если конфиг не менялся) — если пароль admin/admin уже был
                  сменён, в отчёте задачи <span className="font-mono">defaultLoginVerified: false</span> означает именно это, а не сбой.
                </li>
              )}
            </ul>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            {alreadyInstalled ? "Переустановить" : "Установить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InstallRemnawavePanelDialog({ vps }: { vps: VpsInstanceDetail }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => adminApi.installRemnawavePanelOnVpsInstance(vps.id),
    onSuccess: async () => {
      toast.success("Задача установки панели Remnawave поставлена.");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-vps-instance", vps.id] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось поставить задачу установки панели."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Установить панель Remnawave</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Установить панель Remnawave?</DialogTitle>
          <DialogDescription>
            Поставит Postgres + Redis + backend Remnawave на этот сервер и сам зарегистрирует панель в системе с реально выпущенным
            API-токеном — в отличие от 3x-ui, ручной регистрации после установки не требуется.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            Установить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PanelProtocolCard({ vps, mayWrite }: { vps: VpsInstanceDetail; mayWrite: boolean }) {
  const hasInstallReport = (vps.latestReports ?? []).some((report) => report.jobType === "INSTALL_PANEL");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Панель / протокол</CardTitle>
        <CardDescription>Что установлено на этом сервере, и управление установкой</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {vps.panelCode && vps.controlPlaneSourceId ? (
            <>
              <span className="text-muted-foreground">Панель:</span>
              <Link href={`/infrastructure/panels-and-servers?source=${vps.controlPlaneSourceId}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                  {vps.panelCode} ({vps.panelProviderType})
                </Badge>
              </Link>
            </>
          ) : (
            <span className="text-muted-foreground">Без панели.</span>
          )}
        </div>

        {vps.deployedProtocols && vps.deployedProtocols.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {vps.deployedProtocols.map((protocol, index) => (
              <Badge key={index} variant="outline">
                {protocol.protocolCode} · {protocol.deploymentMethod} · {protocol.status}
              </Badge>
            ))}
          </div>
        )}

        {mayWrite && !vps.panelCode && (
          <div className="flex flex-wrap gap-2">
            <InstallPanelDialog vps={vps} alreadyInstalled={hasInstallReport} />
            <InstallRemnawavePanelDialog vps={vps} />
            <InstallRemnawaveNodeDialog vps={vps} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
