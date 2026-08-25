"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { PromoCode } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { discountTypes, promoCodeSchema, promoCodeStatuses, type PromoCodeValues } from "@/features/referrals/schema";

function apiErrorMessage(error: ApiError): string {
  if (error.status === 409) return "Такой код уже существует.";
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

export function PromoCodeDialog({ promoCode, trigger }: { promoCode?: PromoCode; trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isEdit = Boolean(promoCode);
  const partners = useQuery({ queryKey: ["admin-referral-partners"], queryFn: () => adminApi.listReferralPartners(), retry: false, enabled: open });
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false, enabled: open });

  const defaultValues: PromoCodeValues = {
    code: promoCode?.code ?? "",
    referralPartnerId: promoCode?.referralPartnerId ?? "",
    discountType: promoCode?.discountType ?? "PERCENT",
    discountValue: promoCode ? String(promoCode.discountValue) : "",
    payoutPercent: promoCode ? String(promoCode.payoutPercent) : "",
    brandIds: promoCode?.brandIds ?? [],
    status: promoCode?.status ?? "ACTIVE",
  };
  const form = useForm<PromoCodeValues>({ resolver: zodResolver(promoCodeSchema), defaultValues });
  const discountType = useWatch({ control: form.control, name: "discountType" });
  const brandIds = useWatch({ control: form.control, name: "brandIds" });

  const mutation = useMutation({
    mutationFn: (values: PromoCodeValues) => {
      const body = {
        code: values.code,
        referralPartnerId: values.referralPartnerId,
        discountType: values.discountType,
        discountValue: Number(values.discountValue),
        payoutPercent: Number(values.payoutPercent),
        brandIds: values.brandIds,
        status: values.status,
      };
      return isEdit ? adminApi.updatePromoCode(promoCode!.id, body) : adminApi.createPromoCode(body);
    },
    onSuccess: async () => {
      toast.success(isEdit ? "Промокод обновлён." : "Промокод создан.");
      form.reset(defaultValues);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        form.setError("code", { message: "Такой код уже существует." });
        return;
      }
      toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось сохранить.");
    },
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));
  const onOpenChange = (next: boolean) => {
    if (!next) form.reset(defaultValues);
    setOpen(next);
  };
  const toggleBrand = (id: string) => {
    const next = brandIds.includes(id) ? brandIds.filter((value) => value !== id) : [...brandIds, id];
    form.setValue("brandIds", next, { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm">
              <PlusIcon />
              Создать промокод
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Изменить промокод" : "Создать промокод"}</DialogTitle>
        </DialogHeader>
        <form className="contents" onSubmit={submit}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(form.formState.errors.code)}>
                <FieldLabel htmlFor="promo-code">Код</FieldLabel>
                <Input id="promo-code" maxLength={40} placeholder="WELCOME20" {...form.register("code")} />
                <FieldError errors={[form.formState.errors.code]} />
              </Field>
              <Controller
                control={form.control}
                name="referralPartnerId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={Boolean(fieldState.error)}>
                    <FieldLabel htmlFor="promo-partner">Партнёр</FieldLabel>
                    <Select items={partners.data?.map((partner) => ({ value: partner.id, label: partner.name })) ?? []} value={field.value || null} onValueChange={(value) => field.onChange(value ?? "")}>
                      <SelectTrigger id="promo-partner" className="w-full">
                        <SelectValue placeholder="Выберите партнёра…" />
                      </SelectTrigger>
                      <SelectContent>
                        {partners.data?.map((partner) => (
                          <SelectItem key={partner.id} value={partner.id}>
                            {partner.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Controller
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <Field className="sm:col-span-1">
                    <FieldLabel htmlFor="promo-discount-type">Тип скидки</FieldLabel>
                    <Select
                      items={[
                        { value: "PERCENT", label: "% скидка" },
                        { value: "FIXED_PRICE", label: "Фиксированная цена" },
                      ]}
                      value={field.value}
                      onValueChange={(value) => field.onChange((value as (typeof discountTypes)[number]) ?? "PERCENT")}
                    >
                      <SelectTrigger id="promo-discount-type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENT">% скидка</SelectItem>
                        <SelectItem value="FIXED_PRICE">Фиксированная цена</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Field data-invalid={Boolean(form.formState.errors.discountValue)}>
                <FieldLabel htmlFor="promo-discount-value">{discountType === "PERCENT" ? "%" : "Цена"}</FieldLabel>
                <Input id="promo-discount-value" inputMode="decimal" placeholder={discountType === "PERCENT" ? "20" : "9.99"} {...form.register("discountValue")} />
                <FieldError errors={[form.formState.errors.discountValue]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.payoutPercent)}>
                <FieldLabel htmlFor="promo-payout">Выплата, %</FieldLabel>
                <Input id="promo-payout" inputMode="decimal" placeholder="10" {...form.register("payoutPercent")} />
                <FieldError errors={[form.formState.errors.payoutPercent]} />
              </Field>
            </div>
            <FieldDescription>Выплата считается от полной цены заказа до скидки, а не от суммы, которую реально заплатил клиент.</FieldDescription>
            <Field data-invalid={Boolean(form.formState.errors.brandIds)}>
              <FieldLabel>Бренды</FieldLabel>
              <div className="flex flex-col gap-2 rounded-md border p-3">
                {brands.data?.map((brand) => (
                  <label key={brand.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={brandIds.includes(brand.id)} onCheckedChange={() => toggleBrand(brand.id)} />
                    {brand.name}
                  </label>
                ))}
              </div>
              <FieldDescription>Одна и та же скидка и выплата действуют одинаково на всех выбранных брендах — отдельных значений на бренд нет.</FieldDescription>
              <FieldError errors={[form.formState.errors.brandIds]} />
            </Field>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="promo-status">Статус</FieldLabel>
                  <Select items={promoCodeStatuses.map((value) => ({ value, label: value }))} value={field.value} onValueChange={(value) => field.onChange(value ?? "ACTIVE")}>
                    <SelectTrigger id="promo-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {promoCodeStatuses.map((value) => (
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
              {isEdit ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
