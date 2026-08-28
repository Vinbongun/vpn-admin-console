"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
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
  const form = useForm<RotateCredentialsValues>({ resolver: zodResolver(rotateCredentialsSchema), defaultValues: { baseUrl: "", apiToken: "" } });

  const mutation = useMutation({
    mutationFn: (values: RotateCredentialsValues) => adminApi.setControlPlaneSourceCredentials(source.id, values),
    onSuccess: async () => {
      toast.success("Credentials обновлены.");
      form.reset({ baseUrl: "", apiToken: "" });
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
      {mayWrite && (
        <form className="contents" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <FieldGroup>
            <p className="text-xs text-muted-foreground">Текущие значения нигде не хранятся в открытом виде — заполните оба поля заново, чтобы заменить.</p>
            <CredentialsFields form={form} optional={false} />
          </FieldGroup>
          <Button size="sm" type="submit" className="self-start" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner />}
            Сохранить credentials
          </Button>
        </form>
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
            <div key={vps.id} className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm">
              <span className="font-medium">{vps.code}</span>
              <span className="text-xs text-muted-foreground">{vps.host}</span>
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
      countryCode: source.countryCode ?? "",
      comment: source.comment ?? "",
    },
  });
  const countryCode = useWatch({ control: form.control, name: "countryCode" });

  const mutation = useMutation({
    mutationFn: (values: UpdateSourceValues) =>
      adminApi.updateControlPlaneSource(source.id, {
        code: values.code,
        status: values.status,
        ...(values.countryCode ? { countryCode: values.countryCode } : {}),
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
      <form className="contents" onSubmit={submit}>
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
          <Field data-invalid={Boolean(form.formState.errors.countryCode)}>
            <FieldLabel htmlFor="source-edit-country">
              Страна панели {countryCode && <CountryFlag code={countryCode} className="ml-1" />}
            </FieldLabel>
            <Input id="source-edit-country" disabled={!mayWrite} placeholder="Например DE" maxLength={2} {...form.register("countryCode")} />
            <FieldError errors={[form.formState.errors.countryCode]} />
            <p className="text-xs text-muted-foreground">Нужна для синхронизации 3x-ui-панелей — у их API нет своего понятия страны.</p>
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.comment)}>
            <FieldLabel htmlFor="source-edit-comment">Комментарий</FieldLabel>
            <Textarea id="source-edit-comment" disabled={!mayWrite} rows={3} {...form.register("comment")} />
            <FieldError errors={[form.formState.errors.comment]} />
          </Field>
        </FieldGroup>
        <div className="mt-4 flex flex-col gap-4">
          <CredentialsSection source={source} mayWrite={mayWrite} />
          <LinkedVpsSection sourceId={source.id} />
        </div>
        <DialogFooter className="mt-4">
          <DialogClose render={<Button type="button" variant="outline" />}>Закрыть</DialogClose>
          {mayWrite && (
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending && <Spinner />}
              Сохранить
            </Button>
          )}
        </DialogFooter>
      </form>
    </>
  );
}
