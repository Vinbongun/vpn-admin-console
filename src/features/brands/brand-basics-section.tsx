"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { BrandDetail } from "@/api/types";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { brandBasicsSchema, brandStatuses, type BrandBasicsValues } from "@/features/brands/schema";

export function BrandBasicsSection({ brand, mayWrite }: { brand: BrandDetail; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const form = useForm<BrandBasicsValues>({
    resolver: zodResolver(brandBasicsSchema),
    defaultValues: {
      name: brand.name,
      status: brand.status as BrandBasicsValues["status"],
      portalUrl: brand.portalUrl ?? "",
      homepageUrl: brand.homepageUrl ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: BrandBasicsValues) =>
      adminApi.updateBrand(brand.id, {
        name: values.name,
        status: values.status,
        ...(values.portalUrl ? { portalUrl: values.portalUrl } : {}),
        ...(values.homepageUrl ? { homepageUrl: values.homepageUrl } : {}),
      }),
    onSuccess: async () => {
      toast.success("Основные настройки сохранены.");
      await queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Не удалось сохранить."),
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Основное" description="Название, статус и справочные ссылки для админов" />
      <Card>
        <CardContent>
          <form className="contents" onSubmit={submit}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(form.formState.errors.name)}>
                  <FieldLabel htmlFor="brand-basics-name">Название</FieldLabel>
                  <Input id="brand-basics-name" disabled={!mayWrite} {...form.register("name")} />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="brand-basics-status">Статус</FieldLabel>
                      <Select disabled={!mayWrite} items={brandStatuses.map((value) => ({ value, label: value }))} value={field.value} onValueChange={(value) => field.onChange(value ?? "ACTIVE")}>
                        <SelectTrigger id="brand-basics-status" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {brandStatuses.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </div>
              <Field data-invalid={Boolean(form.formState.errors.portalUrl)}>
                <FieldLabel htmlFor="brand-basics-portal">Ссылка на ЛК клиента (portalUrl)</FieldLabel>
                <Input id="brand-basics-portal" disabled={!mayWrite} placeholder="https://portal.example.com" {...form.register("portalUrl")} />
                <FieldError errors={[form.formState.errors.portalUrl]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.homepageUrl)}>
                <FieldLabel htmlFor="brand-basics-homepage">Ссылка на главную сайта (homepageUrl)</FieldLabel>
                <Input id="brand-basics-homepage" disabled={!mayWrite} placeholder="https://example.com" {...form.register("homepageUrl")} />
                <FieldError errors={[form.formState.errors.homepageUrl]} />
              </Field>
              {mayWrite && (
                <Button disabled={mutation.isPending} type="submit" className="self-start">
                  {mutation.isPending && <Spinner />}
                  Сохранить
                </Button>
              )}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
