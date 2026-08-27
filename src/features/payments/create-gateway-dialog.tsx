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
import { CredentialsEditor, credentialsToRecord, type CredentialPair } from "@/features/payments/credentials-editor";
import { createGatewaySchema, gatewayStatuses, type CreateGatewayValues } from "@/features/payments/schema";

function apiErrorMessage(error: ApiError): string {
  if (error.status === 409) return "Шлюз с таким кодом уже существует.";
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

const defaultValues: CreateGatewayValues = { code: "", name: "", status: "ACTIVE" };

export function CreateGatewayDialog() {
  const [open, setOpen] = useState(false);
  const [pairs, setPairs] = useState<CredentialPair[]>([]);
  const queryClient = useQueryClient();
  const form = useForm<CreateGatewayValues>({ resolver: zodResolver(createGatewaySchema), defaultValues });

  const mutation = useMutation({
    mutationFn: (values: CreateGatewayValues) => {
      const credentials = credentialsToRecord(pairs);
      return adminApi.createPaymentGateway({ ...values, ...(Object.keys(credentials).length > 0 ? { credentials } : {}) });
    },
    onSuccess: async () => {
      toast.success("Шлюз создан.");
      form.reset(defaultValues);
      setPairs([]);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-payment-gateways"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось создать шлюз."),
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));

  const onOpenChange = (next: boolean) => {
    if (!next) {
      form.reset(defaultValues);
      setPairs([]);
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon />
            Создать шлюз
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создать платёжный шлюз</DialogTitle>
          <DialogDescription>Учётные данные шифруются и никогда не возвращаются API — только флаг «заданы».</DialogDescription>
        </DialogHeader>
        <form className="contents" onSubmit={submit}>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.code)}>
              <FieldLabel htmlFor="gateway-code">Код шлюза</FieldLabel>
              <Input id="gateway-code" placeholder="Например PLATIRU" {...form.register("code")} />
              <FieldError errors={[form.formState.errors.code]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="gateway-name">Название</FieldLabel>
              <Input id="gateway-name" placeholder="Например Плати.ру" {...form.register("name")} />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="gateway-status">Статус</FieldLabel>
                  <Select items={gatewayStatuses.map((value) => ({ value, label: value }))} value={field.value} onValueChange={(value) => field.onChange(value ?? "ACTIVE")}>
                    <SelectTrigger id="gateway-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Статус</SelectLabel>
                        {gatewayStatuses.map((value) => (
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
            <CredentialsEditor pairs={pairs} onChange={setPairs} />
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending && <Spinner />}
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
