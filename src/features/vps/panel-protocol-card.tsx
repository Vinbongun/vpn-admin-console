"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsInstanceDetail } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
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
              <li>Порт, путь панели (webBasePath) и логин/пароль генерируются случайно и видны после установки в блоке «Креды панели» ниже.</li>
              <li>Панель регистрируется в системе автоматически — отдельно заходить и добавлять её через «+ Добавить панель» не нужно.</li>
              <li>Без домена панель работает по голому IP без TLS — привяжите домен кнопкой «Привязать домен + TLS», когда будете готовы.</li>
              {alreadyInstalled && (
                <li>
                  Если панель уже была установлена и настроена ранее (кастомный порт/логин), повторный запуск откажется её переустанавливать — сначала
                  выполните <span className="font-mono">docker compose down -v</span> на сервере вручную.
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

/** 3x-ui only for now (see VpsAutomationService.enqueueReverseProxyInstall) - assigns the picked
 *  free domain to this VPS's panel, then enqueues the install in one step. */
function InstallReverseProxyDialog({ vps }: { vps: VpsInstanceDetail }) {
  const [open, setOpen] = useState(false);
  const [domainId, setDomainId] = useState("");
  const queryClient = useQueryClient();
  const domains = useQuery({ queryKey: ["admin-domains", "all"], queryFn: () => adminApi.listDomains(), retry: false, enabled: open });
  const freeDomains = (domains.data?.domains ?? []).filter((domain) => !domain.controlPlaneSourceId && !domain.vpsInstanceId && !domain.archivedAt);

  const mutation = useMutation({
    mutationFn: async () => {
      await adminApi.assignDomain(domainId, { controlPlaneSourceId: vps.controlPlaneSourceId ?? undefined });
      return adminApi.installReverseProxyOnVpsInstance(vps.id, { domainId });
    },
    onSuccess: async () => {
      toast.success("Домен привязан, задача установки reverse-proxy + TLS поставлена.");
      setOpen(false);
      setDomainId("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-vps-instance", vps.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-domains"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось поставить задачу."),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setDomainId(""); }}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Привязать домен + TLS</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Привязать домен и установить reverse-proxy + TLS</DialogTitle>
          <DialogDescription>
            Выберите свободный домен — панель переключится на него по HTTPS, на корне появится статичная заглушка вместо самой панели.
          </DialogDescription>
        </DialogHeader>
        {domains.isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка доменов…</p>
        ) : freeDomains.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Нет свободных доменов. Купите домен на странице{" "}
            <Link href="/infrastructure/domains" className="underline">
              «Домены»
            </Link>{" "}
            и вернитесь сюда.
          </p>
        ) : (
          <Select items={freeDomains.map((domain) => ({ value: domain.id, label: domain.fqdn }))} value={domainId} onValueChange={(value) => setDomainId(value ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите домен" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Свободные домены</SelectLabel>
                {freeDomains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.fqdn}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button disabled={!domainId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            Привязать и установить
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
              {vps.domainFqdn ? (
                <Badge variant="outline">{vps.domainFqdn} · TLS</Badge>
              ) : (
                mayWrite && vps.panelProviderType === "3X_UI" && <InstallReverseProxyDialog vps={vps} />
              )}
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
