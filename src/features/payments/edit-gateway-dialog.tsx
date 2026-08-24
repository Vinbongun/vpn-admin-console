"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { PaymentGateway } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { gatewayStatuses, updateGatewaySchema, type UpdateGatewayValues } from "@/features/payments/schema";

function apiErrorMessage(error: ApiError): string {
  if (error.status === 409) return "Шлюз с таким кодом уже существует.";
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

export function EditGatewayDialog({ gateway }: { gateway: PaymentGateway }) {
  const queryClient = useQueryClient();
  const form = useForm<UpdateGatewayValues>({
    resolver: zodResolver(updateGatewaySchema),
    defaultValues: { code: gateway.code, name: gateway.name, status: gateway.status as UpdateGatewayValues["status"] },
  });

  const mutation = useMutation({
    mutationFn: (values: UpdateGatewayValues) => adminApi.updatePaymentGateway(gateway.id, values),
    onSuccess: async () => {
      toast.success("Шлюз обновлён.");
      await queryClient.invalidateQueries({ queryKey: ["admin-payment-gateways"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось обновить шлюз."),
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) form.reset({ code: gateway.code, name: gateway.name, status: gateway.status as UpdateGatewayValues["status"] });
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <PencilIcon />
            Редактировать
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{gateway.name}</DialogTitle>
        </DialogHeader>
        <form className="contents" onSubmit={submit}>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.code)}>
              <FieldLabel htmlFor="gateway-edit-code">Код шлюза</FieldLabel>
              <Input id="gateway-edit-code" {...form.register("code")} />
              <FieldError errors={[form.formState.errors.code]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="gateway-edit-name">Название</FieldLabel>
              <Input id="gateway-edit-name" {...form.register("name")} />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="gateway-edit-status">Статус</FieldLabel>
                  <Select items={gatewayStatuses.map((value) => ({ value, label: value }))} value={field.value} onValueChange={(value) => field.onChange(value ?? "ACTIVE")}>
                    <SelectTrigger id="gateway-edit-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gatewayStatuses.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Настоящего удаления нет — «Отключить» это статус INACTIVE, платежи хранят ссылку на шлюз.</p>
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Закрыть</DialogClose>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending && <Spinner />}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
