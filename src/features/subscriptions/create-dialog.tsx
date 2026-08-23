"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { adminApi } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useCreateSubscriptionMutation } from "@/features/subscriptions/queries";
import { createSubscriptionSchema, type CreateSubscriptionValues } from "@/features/subscriptions/schema";

const defaultValues: CreateSubscriptionValues = { brandMembershipId: "", planId: "none", status: "ACTIVE", startsAt: "", expiresAt: "" };

export function CreateSubscriptionDialog() {
  const [open, setOpen] = useState(false);
  const customers = useQuery({ queryKey: ["admin-customers", "subscription-form"], queryFn: () => adminApi.listCustomers({ page: 1, pageSize: 100 }), retry: false });
  const plans = useQuery({ queryKey: ["admin-plans", "subscription-form"], queryFn: () => adminApi.listPlans({ page: 1, pageSize: 100, status: "ACTIVE" }), retry: false });

  const form = useForm<CreateSubscriptionValues>({ resolver: zodResolver(createSubscriptionSchema), defaultValues });
  const createMutation = useCreateSubscriptionMutation(() => {
    form.reset(defaultValues);
    setOpen(false);
  });

  const submit = form.handleSubmit((values) => {
    createMutation.mutate({
      brandMembershipId: values.brandMembershipId,
      ...(values.planId !== "none" ? { planId: values.planId } : {}),
      status: values.status,
      startsAt: new Date(values.startsAt).toISOString(),
      expiresAt: new Date(values.expiresAt).toISOString(),
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon />
            Создать подписку
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Создать подписку</DialogTitle>
          <DialogDescription>Бренд клиента и тариф выбираются из уже существующих записей.</DialogDescription>
        </DialogHeader>
        <form className="contents" onSubmit={submit}>
          <FieldGroup>
            <Controller
              control={form.control}
              name="brandMembershipId"
              render={({ field, fieldState }) => (
                <Field data-invalid={Boolean(fieldState.error)}>
                  <FieldLabel htmlFor="brandMembershipId">Привязка к бренду</FieldLabel>
                  <Select
                    items={customers.data?.items.flatMap((customer) => customer.memberships.map((membership) => ({ value: membership.id, label: `${customer.email} · ${membership.brandCode}` }))) ?? []}
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger id="brandMembershipId" className="w-full">
                      <SelectValue placeholder="Выберите привязку к бренду" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.data?.items.flatMap((customer) =>
                        customer.memberships.map((membership) => (
                          <SelectItem key={membership.id} value={membership.id}>
                            {customer.email} · {membership.brandCode}
                          </SelectItem>
                        )),
                      )}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="planId">Тариф</FieldLabel>
                    <Select
                      items={[{ value: "none", label: "Без тарифа" }, ...(plans.data?.items.map((plan) => ({ value: plan.id, label: `${plan.brandCode} · ${plan.name}` })) ?? [])]}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="planId" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Без тарифа</SelectItem>
                        {plans.data?.items.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.brandCode} · {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="status">Статус</FieldLabel>
                    <Select
                      items={[
                        { value: "PENDING", label: "PENDING" },
                        { value: "TRIAL", label: "TRIAL" },
                        { value: "ACTIVE", label: "ACTIVE" },
                      ]}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">PENDING</SelectItem>
                        <SelectItem value="TRIAL">TRIAL</SelectItem>
                        <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(form.formState.errors.startsAt)}>
                <FieldLabel htmlFor="startsAt">Начало</FieldLabel>
                <Input id="startsAt" type="datetime-local" {...form.register("startsAt")} />
                <FieldError errors={[form.formState.errors.startsAt]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.expiresAt)}>
                <FieldLabel htmlFor="expiresAt">Окончание</FieldLabel>
                <Input id="expiresAt" type="datetime-local" {...form.register("expiresAt")} />
                <FieldError errors={[form.formState.errors.expiresAt]} />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
            <Button disabled={createMutation.isPending} type="submit">
              {createMutation.isPending && <Spinner />}
              Создать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
