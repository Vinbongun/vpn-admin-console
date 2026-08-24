"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilIcon, PlusIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { PaymentMethod } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { gatewayStatuses, paymentMethodSchema, updateMethodSchema, type PaymentMethodValues, type UpdateMethodValues } from "@/features/payments/schema";

function apiErrorMessage(error: ApiError): string {
  if (error.status === 409) return "Способ оплаты с таким кодом уже существует в этом шлюзе.";
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

export function MethodDialog({ gatewayId, method }: { gatewayId: string; method?: PaymentMethod }) {
  if (method) return <EditMethodDialog gatewayId={gatewayId} method={method} />;
  return <CreateMethodDialog gatewayId={gatewayId} />;
}

function CreateMethodDialog({ gatewayId }: { gatewayId: string }) {
  const queryClient = useQueryClient();
  const defaultValues: PaymentMethodValues = { code: "", name: "", status: "ACTIVE" };
  const form = useForm<PaymentMethodValues>({ resolver: zodResolver(paymentMethodSchema), defaultValues });

  const mutation = useMutation({
    mutationFn: (values: PaymentMethodValues) => adminApi.createPaymentMethod(gatewayId, values),
    onSuccess: async () => {
      toast.success("Способ оплаты добавлен.");
      form.reset(defaultValues);
      await queryClient.invalidateQueries({ queryKey: ["admin-payment-gateways"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось добавить способ оплаты."),
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog onOpenChange={(open) => open && form.reset(defaultValues)}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <PlusIcon />
            Добавить способ
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Добавить способ оплаты</DialogTitle>
        </DialogHeader>
        <form className="contents" onSubmit={submit}>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.code)}>
              <FieldLabel htmlFor="method-code">Код способа</FieldLabel>
              <Input id="method-code" placeholder="Например SBP" {...form.register("code")} />
              <FieldError errors={[form.formState.errors.code]} />
            </Field>
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="method-name">Название</FieldLabel>
              <Input id="method-name" placeholder="Например СБП" {...form.register("name")} />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
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

function EditMethodDialog({ gatewayId, method }: { gatewayId: string; method: PaymentMethod }) {
  const queryClient = useQueryClient();
  const form = useForm<UpdateMethodValues>({
    resolver: zodResolver(updateMethodSchema),
    defaultValues: { name: method.name, status: method.status as UpdateMethodValues["status"] },
  });

  const mutation = useMutation({
    mutationFn: (values: UpdateMethodValues) => adminApi.updatePaymentMethod(gatewayId, method.id, values),
    onSuccess: async () => {
      toast.success("Способ оплаты обновлён.");
      await queryClient.invalidateQueries({ queryKey: ["admin-payment-gateways"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось обновить способ оплаты."),
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog onOpenChange={(open) => open && form.reset({ name: method.name, status: method.status as UpdateMethodValues["status"] })}>
      <DialogTrigger render={<Button size="icon-sm" variant="ghost" />}>
        <PencilIcon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{method.name}</DialogTitle>
        </DialogHeader>
        <form className="contents" onSubmit={submit}>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="method-edit-name">Название</FieldLabel>
              <Input id="method-edit-name" {...form.register("name")} />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="method-edit-status">Статус</FieldLabel>
                  <Select items={gatewayStatuses.map((value) => ({ value, label: value }))} value={field.value} onValueChange={(value) => field.onChange(value ?? "ACTIVE")}>
                    <SelectTrigger id="method-edit-status" className="w-full">
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
                  <p className="text-xs text-muted-foreground">Настоящего удаления нет — «Отключить» это статус INACTIVE.</p>
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
