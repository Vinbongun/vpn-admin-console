"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { ReferralPartner } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { partnerSchema, partnerStatuses, type PartnerValues } from "@/features/referrals/schema";

export function PartnerDialog({ partner, trigger }: { partner?: ReferralPartner; trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = Boolean(partner);
  const defaultValues: PartnerValues = { name: partner?.name ?? "", status: partner?.status ?? "ACTIVE" };
  const form = useForm<PartnerValues>({ resolver: zodResolver(partnerSchema), defaultValues });

  const mutation = useMutation({
    mutationFn: (values: PartnerValues) => (isEdit ? adminApi.updateReferralPartner(partner!.id, values) : adminApi.createReferralPartner(values)),
    onSuccess: async () => {
      toast.success(isEdit ? "Реферал обновлён." : "Реферал добавлен.");
      form.reset(defaultValues);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-referral-partners"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Не удалось сохранить."),
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));
  const onOpenChange = (next: boolean) => {
    if (!next) form.reset(defaultValues);
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm">
              <PlusIcon />
              Добавить
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Изменить реферала" : "Добавить реферала"}</DialogTitle>
        </DialogHeader>
        <form className="contents" onSubmit={submit}>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="partner-name">Имя</FieldLabel>
              <Input id="partner-name" placeholder="Имя партнёра" {...form.register("name")} />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="partner-status">Статус</FieldLabel>
                  <Select items={partnerStatuses.map((value) => ({ value, label: value }))} value={field.value} onValueChange={(value) => field.onChange(value ?? "ACTIVE")}>
                    <SelectTrigger id="partner-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {partnerStatuses.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending && <Spinner />}
              {isEdit ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
