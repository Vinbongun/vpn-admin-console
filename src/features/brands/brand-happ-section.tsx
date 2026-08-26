"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquareWarningIcon, PlusIcon, XIcon } from "lucide-react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { BrandDetail } from "@/api/types";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { brandHappSchema, type BrandHappValues } from "@/features/brands/schema";

function DecoyTextRow({
  title,
  index,
  name,
  form,
  mayWrite,
  onRemove,
}: {
  title: string;
  index: number;
  name: "decoyExpired" | "decoyBlocked";
  form: ReturnType<typeof useForm<BrandHappValues>>;
  mayWrite: boolean;
  onRemove: () => void;
}) {
  const value = useWatch({ control: form.control, name: `${name}.${index}.value` }) ?? "";

  return (
    <div className="flex items-start gap-2">
      <Field className="flex-1" data-invalid={Boolean(form.formState.errors[name]?.[index]?.value)}>
        <FieldLabel htmlFor={`${name}-${index}`}>
          {title} {index + 1}
        </FieldLabel>
        <div className="relative">
          <MessageSquareWarningIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${name}-${index}`}
            className="pl-8"
            disabled={!mayWrite}
            maxLength={60}
            placeholder="Например: 🇫🇷 Ваша подписка закончилась"
            {...form.register(`${name}.${index}.value`)}
          />
        </div>
        <FieldError errors={[form.formState.errors[name]?.[index]?.value]} />
      </Field>
      <div className="mt-8 flex items-center gap-1">
        <span className="shrink-0 text-xs text-muted-foreground">{value.length} / 60</span>
        {mayWrite && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove}>
            <XIcon />
          </Button>
        )}
      </div>
    </div>
  );
}

function DecoyTextsList({
  title,
  description,
  emptyHint,
  name,
  form,
  mayWrite,
}: {
  title: string;
  description: string;
  emptyHint: string;
  name: "decoyExpired" | "decoyBlocked";
  form: ReturnType<typeof useForm<BrandHappValues>>;
  mayWrite: boolean;
}) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name });

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {fields.length === 0 && <p className="text-xs text-muted-foreground">{emptyHint}</p>}
      {fields.map((field, index) => (
        <DecoyTextRow key={field.id} title={title} index={index} name={name} form={form} mayWrite={mayWrite} onRemove={() => remove(index)} />
      ))}
      {mayWrite && fields.length < 10 && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => append({ value: "" })}>
          <PlusIcon />
          Добавить подключение
        </Button>
      )}
      <FieldDescription>
        Можно использовать <code>{"{site}"}</code> — подставится ссылка на сайт бренда (поле «Сайт бренда» в «Публичная конфигурация»).
      </FieldDescription>
    </div>
  );
}

export function BrandHappSection({ brand, mayWrite }: { brand: BrandDetail; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const form = useForm<BrandHappValues>({
    resolver: zodResolver(brandHappSchema),
    defaultValues: {
      profileTitle: brand.public.profileTitle ?? "",
      announce: brand.public.announce ?? "",
      supportUrl: brand.public.supportUrl ?? "",
      profileUpdateIntervalHours: brand.public.profileUpdateIntervalHours != null ? String(brand.public.profileUpdateIntervalHours) : "",
      decoyExpired: (brand.public.decoyTexts?.expired ?? []).map((value) => ({ value })),
      decoyBlocked: (brand.public.decoyTexts?.blocked ?? []).map((value) => ({ value })),
    },
  });
  const profileTitle = useWatch({ control: form.control, name: "profileTitle" });
  const announce = useWatch({ control: form.control, name: "announce" });

  const mutation = useMutation({
    mutationFn: (values: BrandHappValues) =>
      adminApi.updateBrand(brand.id, {
        public: {
          // An explicit null (not an omitted key) is what tells the backend's jsonb merge to actually clear a
          // previously-set profileTitle back to the brand-name default - omitting the key would leave the old
          // value untouched. Cast past the generated type, which only documents the string case.
          profileTitle: (values.profileTitle || null) as string | undefined,
          announce: values.announce || undefined,
          supportUrl: values.supportUrl || undefined,
          ...(values.profileUpdateIntervalHours ? { profileUpdateIntervalHours: Number(values.profileUpdateIntervalHours) } : {}),
          decoyTexts: {
            expired: values.decoyExpired.map((entry) => entry.value.trim()).filter(Boolean),
            blocked: values.decoyBlocked.map((entry) => entry.value.trim()).filter(Boolean),
          },
        },
      }),
    onSuccess: async () => {
      toast.success("Настройки Happ сохранены.");
      await queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Не удалось сохранить."),
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Настройка Happ" description="Что видит клиент в самом VPN-приложении (Happ и подобные)" />
      <Card>
        <CardContent>
          <form className="contents" onSubmit={submit}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={Boolean(form.formState.errors.profileTitle)}>
                  <FieldLabel htmlFor="brand-happ-profile-title">Название в Happ (profileTitle)</FieldLabel>
                  <Input id="brand-happ-profile-title" disabled={!mayWrite} maxLength={25} placeholder="По умолчанию — название бренда" {...form.register("profileTitle")} />
                  <FieldDescription>{profileTitle.length} / 25 · заголовок группы серверов в VPN-приложении клиента</FieldDescription>
                  <FieldError errors={[form.formState.errors.profileTitle]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="brand-happ-support-url">Ссылка на поддержку (supportUrl)</FieldLabel>
                  <Input id="brand-happ-support-url" disabled={!mayWrite} placeholder="https://t.me/support_chat" {...form.register("supportUrl")} />
                  <FieldDescription>Показывается в Happ отдельной иконкой (например, Telegram-чат).</FieldDescription>
                </Field>
              </div>
              <Field data-invalid={Boolean(form.formState.errors.announce)}>
                <FieldLabel htmlFor="brand-happ-announce">Баннер в приложении (announce)</FieldLabel>
                <Textarea id="brand-happ-announce" disabled={!mayWrite} maxLength={200} rows={2} {...form.register("announce")} />
                <FieldDescription>{announce.length} / 200</FieldDescription>
                <FieldError errors={[form.formState.errors.announce]} />
              </Field>
              <Field data-invalid={Boolean(form.formState.errors.profileUpdateIntervalHours)}>
                <FieldLabel htmlFor="brand-happ-update-interval">Как часто клиент обновляет список серверов (в часах)</FieldLabel>
                <Input
                  id="brand-happ-update-interval"
                  type="number"
                  min={1}
                  max={24}
                  step={1}
                  disabled={!mayWrite}
                  placeholder="По умолчанию — 6"
                  {...form.register("profileUpdateIntervalHours")}
                />
                <FieldDescription>
                  Как часто приложение клиента (Happ и подобные) само перезапрашивает список серверов. Минимальный шаг — 1 час, меньше физически не поддерживается используемым протоколом.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.profileUpdateIntervalHours]} />
              </Field>
              <DecoyTextsList
                title="Тексты при истечении подписки"
                description="Подключения, которые клиент увидит вместо реальных серверов, когда его подписка закончилась (статус EXPIRED). Если не заполнить — будет показан текст по умолчанию."
                emptyHint="Список пуст — будет показан текст по умолчанию."
                name="decoyExpired"
                form={form}
                mayWrite={mayWrite}
              />
              <DecoyTextsList
                title="Тексты при блокировке подписки"
                description="Подключения при заблокированной подписке (REVOKED/SUSPENDED/PAST_DUE). Если не заполнить — будет показан текст по умолчанию."
                emptyHint="Список пуст — будет показан текст по умолчанию."
                name="decoyBlocked"
                form={form}
                mayWrite={mayWrite}
              />
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
