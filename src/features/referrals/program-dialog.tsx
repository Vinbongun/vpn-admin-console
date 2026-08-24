"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminApi } from "@/api/client";
import type { ReferralProgram } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { programStatuses, upsertProgramSchema, type UpsertProgramValues } from "@/features/referrals/schema";

function defaultsFor(program?: ReferralProgram): UpsertProgramValues {
  return {
    brandId: program?.brandId ?? "",
    campaignCode: program?.campaignCode ?? "DEFAULT",
    rewardPercent: program ? String(program.rewardPercent) : "10",
    status: program?.status ?? "ACTIVE",
  };
}

export function ProgramDialog({ program, trigger }: { program?: ReferralProgram; trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });

  const form = useForm<UpsertProgramValues>({ resolver: zodResolver(upsertProgramSchema), defaultValues: defaultsFor(program) });

  useEffect(() => {
    if (open) form.reset(defaultsFor(program));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const mutation = useMutation({
    mutationFn: adminApi.upsertReferralProgram,
    onSuccess: async () => {
      toast.success(program ? "Программа обновлена." : "Программа создана.");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-referral-programs"] });
    },
    onError: () => toast.error("Не удалось сохранить программу."),
  });

  const submit = form.handleSubmit((values) => {
    mutation.mutate({
      brandId: values.brandId,
      campaignCode: values.campaignCode,
      rewardPercent: Number(values.rewardPercent),
      status: values.status,
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm">
              <PlusIcon />
              Создать программу
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{program ? "Обновить программу" : "Создать программу"}</DialogTitle>
          <DialogDescription>Программа определяется парой бренд + код кампании. Повторное сохранение с тем же кодом обновит существующую запись.</DialogDescription>
        </DialogHeader>
        <form className="contents" onSubmit={submit}>
          <FieldGroup>
            <Controller
              control={form.control}
              name="brandId"
              render={({ field, fieldState }) => (
                <Field data-invalid={Boolean(fieldState.error)}>
                  <FieldLabel htmlFor="program-brand">Бренд</FieldLabel>
                  <Select
                    items={brands.data?.map((brand) => ({ value: brand.id, label: brand.name })) ?? []}
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? "")}
                    disabled={Boolean(program)}
                  >
                    <SelectTrigger id="program-brand" className="w-full">
                      <SelectValue placeholder="Бренд…" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.data?.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(form.formState.errors.campaignCode)}>
                <FieldLabel htmlFor="program-code">Код кампании</FieldLabel>
                <Input id="program-code" placeholder="DEFAULT" {...form.register("campaignCode")} />
                <FieldError errors={[form.formState.errors.campaignCode]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.rewardPercent)}>
                <FieldLabel htmlFor="program-reward">Процент награды</FieldLabel>
                <Input id="program-reward" type="number" min={0} max={100} step="0.1" {...form.register("rewardPercent")} />
                <FieldError errors={[form.formState.errors.rewardPercent]} />
              </Field>
            </div>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="program-status">Статус</FieldLabel>
                  <Select items={programStatuses.map((value) => ({ value, label: value }))} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="program-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {programStatuses.map((value) => (
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
              {program ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
