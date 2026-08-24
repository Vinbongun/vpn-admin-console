"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { BrandDetail } from "@/api/types";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { brandPublicSchema, type BrandPublicValues } from "@/features/brands/schema";

export function BrandPublicSection({ brand, mayWrite }: { brand: BrandDetail; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const form = useForm<BrandPublicValues>({
    resolver: zodResolver(brandPublicSchema),
    defaultValues: {
      logoUrl: brand.public.logoUrl ?? "",
      faviconUrl: brand.public.faviconUrl ?? "",
      supportEmail: brand.public.supportEmail ?? "",
      termsUrl: brand.public.termsUrl ?? "",
      privacyUrl: brand.public.privacyUrl ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: BrandPublicValues) =>
      adminApi.updateBrand(brand.id, {
        public: {
          logoUrl: values.logoUrl || undefined,
          faviconUrl: values.faviconUrl || undefined,
          supportEmail: values.supportEmail || undefined,
          termsUrl: values.termsUrl || undefined,
          privacyUrl: values.privacyUrl || undefined,
        },
      }),
    onSuccess: async () => {
      toast.success("Публичная конфигурация сохранена.");
      await queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Не удалось сохранить."),
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Публичная конфигурация" description="То, что видит сам клиент в своём ЛК — логотип, favicon, поддержка, условия и политика" />
      <Card>
        <CardContent>
          <form className="contents" onSubmit={submit}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="brand-public-logo">Логотип (logoUrl)</FieldLabel>
                  <Input id="brand-public-logo" disabled={!mayWrite} placeholder="https://…/logo.svg" {...form.register("logoUrl")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="brand-public-favicon">Favicon (faviconUrl)</FieldLabel>
                  <Input id="brand-public-favicon" disabled={!mayWrite} placeholder="https://…/favicon.ico" {...form.register("faviconUrl")} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="brand-public-support">Email поддержки (supportEmail)</FieldLabel>
                <Input id="brand-public-support" disabled={!mayWrite} placeholder="support@example.com" {...form.register("supportEmail")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="brand-public-terms">Условия использования (termsUrl)</FieldLabel>
                  <Input id="brand-public-terms" disabled={!mayWrite} placeholder="https://…/terms" {...form.register("termsUrl")} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="brand-public-privacy">Политика конфиденциальности (privacyUrl)</FieldLabel>
                  <Input id="brand-public-privacy" disabled={!mayWrite} placeholder="https://…/privacy" {...form.register("privacyUrl")} />
                </Field>
              </div>
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
