"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRightIcon, GlobeIcon, LayoutDashboardIcon, ServerIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsInstanceDetail } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OptionTile, OptionTileDescription, OptionTileTitle } from "@/components/option-tile";
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
      <DialogTrigger render={<OptionTile icon={ServerIcon} />}>
        <OptionTileTitle>{alreadyInstalled ? "Переустановить 3x-ui" : "3x-ui"}</OptionTileTitle>
        <OptionTileDescription>Панель и нода в одном контейнере</OptionTileDescription>
      </DialogTrigger>
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

/**
 * Shared by every "pick a free domain" step (Remnawave panel install here, 3x-ui's reverse-proxy
 * dialog below, and eventually the server wizard's own domain step) - not duplicated per caller.
 * Free = not yet assigned to any panel or VPS, matches the backend's own "free domain" notion.
 */
function DomainPicker({ domainId, onChange }: { domainId: string; onChange: (id: string) => void }) {
  const domains = useQuery({ queryKey: ["admin-domains", "all"], queryFn: () => adminApi.listDomains(), retry: false });
  const freeDomains = (domains.data?.domains ?? []).filter((domain) => !domain.controlPlaneSourceId && !domain.vpsInstanceId && !domain.archivedAt);

  if (domains.isLoading) return <p className="text-sm text-muted-foreground">Загрузка доменов…</p>;
  if (freeDomains.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Нет свободных доменов. Купите домен на странице{" "}
        <Link href="/infrastructure/domains" className="underline">
          «Домены»
        </Link>{" "}
        и вернитесь сюда.
      </p>
    );
  }
  return (
    <Select items={freeDomains.map((domain) => ({ value: domain.id, label: domain.fqdn }))} value={domainId} onValueChange={(value) => onChange(value ?? "")}>
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
  );
}

/**
 * Unlike 3x-ui's InstallPanelDialog (works by bare IP, domain attached later via
 * InstallReverseProxyDialog), a domain is mandatory here and chosen BEFORE the panel install
 * even runs - a bare-IP Remnawave panel is barely usable at all (ProxyCheckMiddleware rejects
 * everything without spoofed proxy headers). The backend reserves the domain, creates its 3 DNS
 * records, and chains straight into the reverse-proxy install - this one call drives all of it.
 */
function InstallRemnawavePanelDialog({ vps }: { vps: VpsInstanceDetail }) {
  const [open, setOpen] = useState(false);
  const [domainId, setDomainId] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => adminApi.installRemnawavePanelOnVpsInstance(vps.id, { domainId }),
    onSuccess: async () => {
      toast.success("Домен закреплён, задача установки панели Remnawave поставлена.");
      setOpen(false);
      setDomainId("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-vps-instance", vps.id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-domains"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось поставить задачу установки панели."),
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setDomainId(""); }}>
      <DialogTrigger render={<OptionTile icon={LayoutDashboardIcon} />}>
        <OptionTileTitle>Панель Remnawave</OptionTileTitle>
        <OptionTileDescription>Отдельная панель — ноды ставятся на другие серверы</OptionTileDescription>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Установить панель Remnawave</DialogTitle>
          <DialogDescription render={<div />}>
            <ul className="list-disc space-y-1.5 pl-4">
              <li>Поставит Postgres + Redis + backend Remnawave и сам зарегистрирует панель в системе с реально выпущенным API-токеном.</li>
              <li>Домен обязателен — без него панель почти бесполезна (её же middleware отклоняет запросы без реального реверс-прокси).</li>
              <li>Из одного домена сделаются 3 записи: заглушка на корне, поддомен панели, поддомен подписки — новый домен для будущих нод покупать не придётся.</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <DomainPicker domainId={domainId} onChange={setDomainId} />
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button disabled={!domainId || mutation.isPending} onClick={() => mutation.mutate()}>
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
        <DomainPicker domainId={domainId} onChange={setDomainId} />
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

function IdentityRow({ icon: Icon, title, subtitle, action, href }: { icon: typeof ServerIcon; title: string; subtitle: string; action?: React.ReactNode; href?: string }) {
  const body = (
    <div className="flex flex-1 items-center gap-3 min-w-0">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      {href ? (
        <Link href={href} className="flex flex-1 items-center gap-3 min-w-0">
          {body}
          {!action && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />}
        </Link>
      ) : (
        body
      )}
      {action}
    </div>
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
      <CardContent className="flex flex-col gap-3">
        {vps.panelCode && vps.controlPlaneSourceId ? (
          <>
            <IdentityRow
              icon={vps.panelProviderType === "REMNAWAVE" ? LayoutDashboardIcon : ServerIcon}
              title={vps.panelCode}
              subtitle={vps.panelProviderType === "3X_UI" ? "3x-ui" : "Remnawave"}
              href={`/infrastructure/panels-and-servers?source=${vps.controlPlaneSourceId}`}
            />
            <IdentityRow
              icon={vps.domainFqdn ? ShieldCheckIcon : GlobeIcon}
              title={vps.domainFqdn ?? "Домен не привязан"}
              subtitle={vps.domainFqdn ? "HTTPS с настоящим сертификатом" : "работает по IP без шифрования"}
              action={!vps.domainFqdn && mayWrite && vps.panelProviderType === "3X_UI" ? <InstallReverseProxyDialog vps={vps} /> : undefined}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">На этом сервере пока ничего не установлено.</p>
        )}

        {vps.deployedProtocols && vps.deployedProtocols.length > 0 && (
          <div className="flex flex-col gap-2">
            {vps.deployedProtocols.map((protocol, index) => (
              <IdentityRow key={index} icon={ServerIcon} title={protocol.protocolCode ?? "—"} subtitle={`${protocol.deploymentMethod} · ${protocol.status}`} />
            ))}
          </div>
        )}

        {mayWrite && !vps.panelCode && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <InstallPanelDialog vps={vps} alreadyInstalled={hasInstallReport} />
            <InstallRemnawavePanelDialog vps={vps} />
            <InstallRemnawaveNodeDialog vps={vps} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
