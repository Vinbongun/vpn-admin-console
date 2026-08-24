"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { ControlPlaneSourceSummary } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { sourceStatuses, updateSourceSchema, type UpdateSourceValues } from "@/features/infrastructure/schema";
import { flagEmoji } from "@/lib/flag-emoji";

function providerLabel(providerType: string) {
  if (providerType === "3X_UI") return "3x-ui";
  if (providerType === "REMNAWAVE") return "Remnawave";
  return providerType;
}

function apiErrorMessage(error: ApiError): string {
  if (error.status === 409) return "Источник с таким кодом уже существует.";
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
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
      <DialogContent className="sm:max-w-md">{source && <SourceEditBody key={source.id} source={source} mayWrite={mayWrite} onClose={() => onOpenChange(false)} />}</DialogContent>
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
      toast.success("Источник обновлён.");
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-sources"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось обновить источник."),
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));
  const flag = flagEmoji(countryCode);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{source.code}</DialogTitle>
        <DialogDescription>Провайдер: {providerLabel(source.providerType)} — не редактируется, задаётся только при создании.</DialogDescription>
      </DialogHeader>
      <form className="contents" onSubmit={submit}>
        <FieldGroup>
          <Field data-invalid={Boolean(form.formState.errors.code)}>
            <FieldLabel htmlFor="source-edit-code">Код источника</FieldLabel>
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
                    {sourceStatuses.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Field data-invalid={Boolean(form.formState.errors.countryCode)}>
            <FieldLabel htmlFor="source-edit-country">
              Страна панели {flag && <span className="ml-1">{flag}</span>}
            </FieldLabel>
            <Input id="source-edit-country" disabled={!mayWrite} placeholder="Например DE" maxLength={2} {...form.register("countryCode")} />
            <FieldError errors={[form.formState.errors.countryCode]} />
          </Field>
          <Field data-invalid={Boolean(form.formState.errors.comment)}>
            <FieldLabel htmlFor="source-edit-comment">Комментарий</FieldLabel>
            <Textarea id="source-edit-comment" disabled={!mayWrite} rows={3} {...form.register("comment")} />
            <FieldError errors={[form.formState.errors.comment]} />
          </Field>
        </FieldGroup>
        <DialogFooter>
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
