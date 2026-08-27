"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { CredentialsFields } from "@/features/infrastructure/credentials-fields";
import { createSourceSchema, providerTypes, sourceStatuses, type CreateSourceValues } from "@/features/infrastructure/schema";

function apiErrorMessage(error: ApiError): string {
  if (error.status === 409) return "Панель с таким кодом уже существует.";
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

export function CreateSourceDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const defaultValues = { code: "", providerType: undefined, status: "ACTIVE" as const, baseUrl: "", apiToken: "" };
  const form = useForm<CreateSourceValues>({ resolver: zodResolver(createSourceSchema), defaultValues });

  const mutation = useMutation({
    mutationFn: adminApi.createControlPlaneSource,
    onSuccess: async () => {
      toast.success("Панель добавлена.");
      form.reset(defaultValues);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-sources"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось добавить панель."),
  });

  const submit = form.handleSubmit((values) =>
    mutation.mutate({
      code: values.code,
      providerType: values.providerType,
      status: values.status,
      ...(values.baseUrl ? { baseUrl: values.baseUrl } : {}),
      ...(values.apiToken ? { apiToken: values.apiToken } : {}),
    }),
  );

  const onOpenChange = (next: boolean) => {
    if (!next) form.reset(defaultValues);
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon />
            Добавить панель
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить панель</DialogTitle>
          <DialogDescription>Регистрирует запись панели управления. Base URL и API-токен необязательны — если заданы, панель заработает сразу.</DialogDescription>
        </DialogHeader>
        <form className="contents" onSubmit={submit}>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.code)}>
              <FieldLabel htmlFor="source-code">Код панели</FieldLabel>
              <Input id="source-code" placeholder="Например DE_PANEL_1" {...form.register("code")} />
              <FieldError errors={[form.formState.errors.code]} />
            </Field>
            <Controller
              control={form.control}
              name="providerType"
              render={({ field, fieldState }) => (
                <Field data-invalid={Boolean(fieldState.error)}>
                  <FieldLabel htmlFor="source-provider">Тип провайдера</FieldLabel>
                  <Select items={providerTypes.map((value) => ({ value, label: value }))} value={field.value ?? null} onValueChange={(value) => field.onChange(value ?? undefined)}>
                    <SelectTrigger id="source-provider" className="w-full">
                      <SelectValue placeholder="Выберите провайдера…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Тип провайдера</SelectLabel>
                        {providerTypes.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="source-status">Статус</FieldLabel>
                  <Select items={sourceStatuses.map((value) => ({ value, label: value }))} value={field.value} onValueChange={(value) => field.onChange(value ?? "ACTIVE")}>
                    <SelectTrigger id="source-status" className="w-full">
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
            <CredentialsFields form={form} optional />
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending && <Spinner />}
              Добавить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
