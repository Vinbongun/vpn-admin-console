"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { ControlPlaneSourceSummary } from "@/api/types";
import { CountryFlag } from "@/components/country-flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { CredentialsFields } from "@/features/infrastructure/credentials-fields";
import { rotateCredentialsSchema, sourceStatuses, updateSourceSchema, type RotateCredentialsValues, type UpdateSourceValues } from "@/features/infrastructure/schema";

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

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

function CredentialsSection({ source, mayWrite }: { source: ControlPlaneSourceSummary; mayWrite: boolean }) {
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
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Credentials</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {source.credentialsConfigured ? <Badge variant="outline">Настроены</Badge> : <Badge variant="destructive">Не настроены</Badge>}
          {source.credentialsConfigured && source.credentialsRotatedAt && <span>обновлены {formatDate(source.credentialsRotatedAt)}</span>}
        </div>
      </div>
      {mayWrite &&
        (expanded ? (
          // A plain div, not a <form> - this section is one of several independent mutations inside
          // the same dialog (see SourceEditBody), each with its own handleSubmit-on-click button.
          <div className="contents">
            <FieldGroup>
              <p className="text-xs text-muted-foreground">Текущие значения нигде не хранятся в открытом виде — заполните оба поля заново, чтобы заменить.</p>
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
      ) : detail.isError ? (
        <p className="text-sm text-destructive">Не удалось получить список нод.</p>
      ) : nodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">У панели пока нет нод — либо credentials не настроены, либо ноды ещё не добавлены.</p>
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
      <DialogContent className="sm:max-w-lg">{source && <SourceEditBody key={source.id} source={source} mayWrite={mayWrite} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function SourceEditBody({ source, mayWrite, onClose }: { source: ControlPlaneSourceSummary; mayWrite: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<UpdateSourceValues>({
    resolver: zodResolver(updateSourceSchema),
    defaultValues: {
      code: source.code,
      status: source.status as UpdateSourceValues["status"],
      comment: source.comment ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: UpdateSourceValues) =>
      adminApi.updateControlPlaneSource(source.id, {
        code: values.code,
        status: values.status,
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
        <DialogTitle>{source.code}</DialogTitle>
        <DialogDescription>Провайдер: {providerLabel(source.providerType)} — не редактируется, задаётся только при создании.</DialogDescription>
      </DialogHeader>
      {/*
        A plain div, not a <form> - this dialog nests CredentialsSection/NodesSection/LinkedVpsSection
        below the code/status/country/comment fields, and a <form> descendant of a <form> is invalid
        HTML (also breaks which section's Enter key submits which mutation). "Сохранить" below calls
        handleSubmit directly from onClick instead of relying on a submit event.
      */}
      <div className="contents">
        <FieldGroup>
          <Field data-invalid={Boolean(form.formState.errors.code)}>
            <FieldLabel htmlFor="source-edit-code">Код панели</FieldLabel>
            <Input id="source-edit-code" disabled={!mayWrite} {...form.register("code")} />
            <FieldError errors={[form.formState.errors.code]} />
          </Field>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="source-edit-status">Статус</FieldLabel>
                <Select disabled={!mayWrite} items={sourceStatuses.map((value) => ({ value, label: value }))} value={field.value} onValueChange={(value) => field.onChange(value ?? "ACTIVE")}>
                  <SelectTrigger id="source-edit-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Статус</SelectLabel>
                      {sourceStatuses.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
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
          <Field data-invalid={Boolean(form.formState.errors.comment)}>
            <FieldLabel htmlFor="source-edit-comment">Комментарий</FieldLabel>
            <Textarea id="source-edit-comment" disabled={!mayWrite} rows={3} {...form.register("comment")} />
            <FieldError errors={[form.formState.errors.comment]} />
          </Field>
        </FieldGroup>
        <div className="mt-4 flex flex-col gap-4">
          <CredentialsSection source={source} mayWrite={mayWrite} />
          {source.providerType === "REMNAWAVE" && <NodesSection sourceId={source.id} mayWrite={mayWrite} />}
          <LinkedVpsSection sourceId={source.id} />
        </div>
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
