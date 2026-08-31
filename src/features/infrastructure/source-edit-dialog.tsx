"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { ControlPlaneSourceSummary } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { CountryFlag } from "@/components/country-flag";
import { CredentialField } from "@/components/credential-field";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { CredentialsFields } from "@/features/infrastructure/credentials-fields";
import { rotateCredentialsSchema, updateSourceSchema, type RotateCredentialsValues, type UpdateSourceValues } from "@/features/infrastructure/schema";

function providerLabel(providerType: string) {
  if (providerType === "3X_UI") return "3x-ui";
  if (providerType === "REMNAWAVE") return "Remnawave";
  return providerType;
}

function apiErrorMessage(error: ApiError): string {
  if (error.status === 409) return "Панель с таким кодом уже существует.";
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

/**
 * Shared by the header (panel + version summary) and PanelAccessSection (actual credential
 * values) - one query, same cache key, so having both read it isn't a duplicate network call.
 * `panelVersion`/`xrayVersion` don't exist in any install report yet (tracked separately as
 * follow-up work) - reading them defensively means the header degrades to "версия неизвестна"
 * today and starts showing real values the moment that field exists, no further frontend change.
 */
function usePanelInstallReport(source: ControlPlaneSourceSummary) {
  const isPanelType = source.providerType === "3X_UI" || source.providerType === "REMNAWAVE";
  const jobType = source.providerType === "REMNAWAVE" ? "INSTALL_REMNAWAVE_PANEL" : "INSTALL_PANEL";
  const vpsInstances = useQuery({ queryKey: ["admin-vps-instances", "all"], queryFn: () => adminApi.listVpsInstances(), retry: false });
  const linkedIds = (vpsInstances.data ?? []).filter((vps) => vps.controlPlaneSourceId === source.id).map((vps) => vps.id);

  const automation = useQuery({
    queryKey: ["admin-source-automation-credentials", source.id, linkedIds.join(",")],
    queryFn: async () => {
      const details = await Promise.all(linkedIds.map((id) => adminApi.getVpsInstance(id)));
      for (const detail of details) {
        const report = (detail.latestReports ?? []).find((entry) => entry.jobType === jobType);
        if (report) return { report, domainFqdn: detail.domainFqdn };
      }
      return undefined;
    },
    enabled: isPanelType && linkedIds.length > 0,
    retry: false,
  });

  const isLoading = vpsInstances.isLoading || (isPanelType && linkedIds.length > 0 && automation.isLoading);
  const payload = automation.data?.report.reportPayload as Record<string, unknown> | undefined;
  return { isLoading, payload, domainFqdn: automation.data?.domainFqdn, isPanelType };
}

/**
 * Replaces the old static "Провайдер: X — не редактируется" line - shows what's actually
 * installed right now, not just the provider type. Panel/Xray version fields don't exist in any
 * report yet (see usePanelInstallReport) - shows an honest "неизвестна" until that lands, rather
 * than a fake number.
 */
function PanelVersionInfo({ source }: { source: ControlPlaneSourceSummary }) {
  const { isLoading, payload, isPanelType } = usePanelInstallReport(source);
  if (!isPanelType) return <DialogDescription>Провайдер: {providerLabel(source.providerType)}</DialogDescription>;

  const panelVersion = typeof payload?.panelVersion === "string" ? payload.panelVersion : undefined;
  const xrayVersion = typeof payload?.xrayVersion === "string" ? payload.xrayVersion : undefined;

  return (
    <DialogDescription render={<div />}>
      <span>Панель: {providerLabel(source.providerType)}</span>
      <span className="mx-1.5">·</span>
      <span>версия панели: {isLoading ? "…" : (panelVersion ?? "неизвестна")}</span>
      <span className="mx-1.5">·</span>
      <span>Xray: {isLoading ? "…" : (xrayVersion ?? "неизвестна")}</span>
    </DialogDescription>
  );
}

/**
 * Only reachable for a source with no automation install report (added manually through
 * "+ Добавить панель", not via install-3x-ui/install-remnawave-panel) - the sole remaining way
 * such a source can ever get credentials, since we have no way to read back what a human typed
 * in. Deliberately write-only: current values are never displayed, only replaced wholesale.
 */
function ManualCredentialsForm({ source, mayWrite }: { source: ControlPlaneSourceSummary; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const form = useForm<RotateCredentialsValues>({ resolver: zodResolver(rotateCredentialsSchema), defaultValues: { baseUrl: "", apiToken: "" } });

  const mutation = useMutation({
    mutationFn: (values: RotateCredentialsValues) => adminApi.setControlPlaneSourceCredentials(source.id, values),
    onSuccess: async () => {
      toast.success("Credentials обновлены.");
      form.reset({ baseUrl: "", apiToken: "" });
      setExpanded(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-sources"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось обновить credentials."),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {source.credentialsConfigured ? <Badge variant="outline">Настроены</Badge> : <Badge variant="destructive">Не настроены</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">Панель добавлена вручную (не нашей автоустановкой) — текущие значения нигде не хранятся в открытом виде, заполните оба поля заново, чтобы заменить.</p>
      {mayWrite &&
        (expanded ? (
          <div className="contents">
            <FieldGroup>
              <CredentialsFields form={form} optional={false} />
            </FieldGroup>
            <div className="flex gap-2 self-start">
              <Button size="sm" type="button" disabled={mutation.isPending} onClick={form.handleSubmit((values) => mutation.mutate(values))}>
                {mutation.isPending && <Spinner />}
                Сохранить credentials
              </Button>
              <Button size="sm" type="button" variant="outline" onClick={() => setExpanded(false)}>
                Отмена
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" type="button" variant="outline" className="self-start" onClick={() => setExpanded(true)}>
            Сменить credentials
          </Button>
        ))}
    </div>
  );
}

/**
 * The one and only "Доступ" block for a panel - never shows both an auto-fetched view and a
 * manual write form at once. Panels our own automation installs (3x-ui, Remnawave) always have
 * a real login/password/address known to us from the install job's own report the moment it
 * succeeds - staff can never type these in by hand, they only ever come from a real install.
 * A source added manually (no such report exists) falls back to ManualCredentialsForm, since
 * that's the only way it could ever get set up in the first place.
 */
function PanelAccessSection({ source, mayWrite }: { source: ControlPlaneSourceSummary; mayWrite: boolean }) {
  const { isLoading: loading, payload, domainFqdn } = usePanelInstallReport(source);
  const username = (typeof payload?.username === "string" ? payload.username : typeof payload?.adminUsername === "string" ? payload.adminUsername : undefined);
  const password = (typeof payload?.password === "string" ? payload.password : typeof payload?.adminPassword === "string" ? payload.adminPassword : undefined);
  const ipUrl = typeof payload?.baseUrl === "string" ? payload.baseUrl : undefined;
  const webBasePath = typeof payload?.webBasePath === "string" ? payload.webBasePath : "";
  const domainUrl = domainFqdn ? `https://${domainFqdn}${webBasePath}` : undefined;
  const hasAutomationCredentials = Boolean(username || password || ipUrl);

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">Доступ</p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : hasAutomationCredentials ? (
        // Every value gets its own full-width row - a domain URL can easily run 40-50+ characters
        // and truncating it inside a half-width column defeats the point of showing it at all.
        <div className="flex flex-col gap-3">
          {ipUrl && <CredentialField label="Путь через IP" value={ipUrl} href={ipUrl} />}
          {domainUrl ? (
            <CredentialField label="Путь через домен" value={domainUrl} href={domainUrl} />
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Путь через домен</span>
              <span className="text-sm text-muted-foreground">Домен не привязан</span>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {username && <CredentialField label="Логин" value={username} />}
            {password && <CredentialField label="Пароль" value={password} maskable />}
          </div>
        </div>
      ) : (
        <ManualCredentialsForm source={source} mayWrite={mayWrite} />
      )}
    </div>
  );
}

function LinkedVpsSection({ sourceId }: { sourceId: string }) {
  const vpsInstances = useQuery({ queryKey: ["admin-vps-instances", "all"], queryFn: () => adminApi.listVpsInstances(), retry: false });
  const linked = (vpsInstances.data ?? []).filter((vps) => vps.controlPlaneSourceId === sourceId);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">VPS этой панели ({vpsInstances.isLoading ? "…" : linked.length})</p>
      {vpsInstances.isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : linked.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет VPS, привязанных к этой панели.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {linked.map((vps) => (
            <Link key={vps.id} href={`/infrastructure/vps/${vps.id}`} className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-accent">
              <span className="font-medium underline">{vps.code}</span>
              <span className="text-xs text-muted-foreground">{vps.host}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NodesSection({ sourceId, mayWrite }: { sourceId: string; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ["admin-infrastructure-source-detail", sourceId], queryFn: () => adminApi.getControlPlaneSourceDetail(sourceId), retry: false });
  const nodes = detail.data?.nodes ?? [];

  const checkNowMutation = useMutation({
    mutationFn: () => adminApi.checkNodesNow(sourceId),
    onSuccess: async ({ checked, changed }) => {
      toast.success(`Проверено нод: ${checked}, изменилось: ${changed}.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-source-detail", sourceId] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось проверить ноды."),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Ноды ({detail.isLoading ? "…" : nodes.length})</p>
        {mayWrite && (
          <Button size="sm" type="button" variant="outline" disabled={checkNowMutation.isPending} onClick={() => checkNowMutation.mutate()}>
            {checkNowMutation.isPending ? <Spinner /> : <RefreshCwIcon />}
            Проверить сейчас
          </Button>
        )}
      </div>
      {detail.isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : nodes.length === 0 ? (
        // Never red here - a panel with genuinely no nodes yet is a normal, expected state, not
        // a failure; a real fetch error (detail.isError) still isn't alarming enough to warrant
        // destructive styling, it's just different wording of the same muted message.
        <p className="text-sm text-muted-foreground">
          {detail.isError ? "Не удалось получить список нод — попробуйте обновить позже." : "У панели пока нет нод — либо credentials не настроены, либо ноды ещё не добавлены."}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {nodes.map((node) => (
            <div key={node.uuid} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm">
              <span className="font-medium">
                {node.name}{" "}
                {node.vpsInstanceCode && node.vpsInstanceId && (
                  <Link href={`/infrastructure/vps/${node.vpsInstanceId}`} className="font-normal text-muted-foreground underline">
                    ({node.vpsInstanceCode})
                  </Link>
                )}
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CountryFlag code={node.countryCode} />
                <span>
                  {node.address}
                  {node.port ? `:${node.port}` : ""}
                </span>
                <Badge variant={node.isConnected ? "outline" : "destructive"}>
                  {node.isDisabled ? "Отключена" : node.isConnecting ? "Подключается" : node.isConnected ? "В сети" : "Не в сети"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SourceEditDialog({
  source,
  onOpenChange,
  mayWrite,
}: {
  source: ControlPlaneSourceSummary | undefined;
  onOpenChange: (open: boolean) => void;
  mayWrite: boolean;
}) {
  return (
    <Dialog open={Boolean(source)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">{source && <SourceEditBody key={source.id} source={source} mayWrite={mayWrite} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function SourceEditBody({ source, mayWrite, onClose }: { source: ControlPlaneSourceSummary; mayWrite: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<UpdateSourceValues>({
    resolver: zodResolver(updateSourceSchema),
    defaultValues: {
      code: source.code,
      comment: source.comment ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: UpdateSourceValues) =>
      adminApi.updateControlPlaneSource(source.id, {
        code: values.code,
        comment: values.comment,
      }),
    onSuccess: async () => {
      toast.success("Панель обновлена.");
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-sources"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось обновить панель."),
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {source.code}
          <StatusBadge status={source.status} />
        </DialogTitle>
        <PanelVersionInfo source={source} />
      </DialogHeader>
      {/*
        A plain div, not a <form> - this dialog nests several independent mutations (panel fields,
        credentials, nodes) below each other, and a <form> descendant of a <form> is invalid HTML
        (also breaks which section's Enter key submits which mutation). "Сохранить" below calls
        handleSubmit directly from onClick instead of relying on a submit event.
      */}
      <div className="contents">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.code)}>
              <FieldLabel htmlFor="source-edit-code">Код панели</FieldLabel>
              <Input id="source-edit-code" disabled={!mayWrite} {...form.register("code")} />
              <FieldError errors={[form.formState.errors.code]} />
            </Field>
            <Field>
              <FieldLabel>Страна</FieldLabel>
              {source.countryCode ? (
                <p className="flex h-9 items-center gap-1.5 text-sm">
                  <CountryFlag code={source.countryCode} />
                  {source.countryCode}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Пока неизвестна — определяется автоматически от VPS, на котором стоит эта панель, при следующей синхронизации.
                </p>
              )}
            </Field>
          </FieldGroup>

          <LinkedVpsSection sourceId={source.id} />
        </div>

        <div className="mt-4">
          <PanelAccessSection source={source} mayWrite={mayWrite} />
        </div>

        {source.providerType === "REMNAWAVE" && (
          <div className="mt-4">
            <NodesSection sourceId={source.id} mayWrite={mayWrite} />
          </div>
        )}

        <Field data-invalid={Boolean(form.formState.errors.comment)} className="mt-4">
          <FieldLabel htmlFor="source-edit-comment">Комментарий</FieldLabel>
          <Textarea id="source-edit-comment" disabled={!mayWrite} rows={3} {...form.register("comment")} />
          <FieldError errors={[form.formState.errors.comment]} />
        </Field>

        <DialogFooter className="mt-4">
          <DialogClose render={<Button type="button" variant="outline" />}>Закрыть</DialogClose>
          {mayWrite && (
            <Button disabled={mutation.isPending} type="button" onClick={submit}>
              {mutation.isPending && <Spinner />}
              Сохранить
            </Button>
          )}
        </DialogFooter>
      </div>
    </>
  );
}
