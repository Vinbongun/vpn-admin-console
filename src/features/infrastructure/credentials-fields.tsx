"use client";

import { InfoIcon } from "lucide-react";
import type { FieldError as RHFFieldError, UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type CredentialsFormValues = { baseUrl: string; apiToken: string };

export function CredentialsFields<T extends CredentialsFormValues>({ form, optional }: { form: UseFormReturn<T>; optional: boolean }) {
  const control = form.control as unknown as UseFormReturn<CredentialsFormValues>["control"];
  const register = form.register as unknown as UseFormReturn<CredentialsFormValues>["register"];
  const errors = form.formState.errors as { baseUrl?: RHFFieldError; apiToken?: RHFFieldError };
  const baseUrl = useWatch({ control, name: "baseUrl" });
  const apiToken = useWatch({ control, name: "apiToken" });
  const noCredentials = optional && !baseUrl && !apiToken;

  return (
    <>
      <Field data-invalid={Boolean(errors.baseUrl)}>
        <FieldLabel htmlFor="source-base-url">Base URL панели{optional ? " (необязательно)" : ""}</FieldLabel>
        <Input id="source-base-url" placeholder="https://panel.example.com" {...register("baseUrl")} />
        <FieldError errors={[errors.baseUrl]} />
      </Field>
      <Field data-invalid={Boolean(errors.apiToken)}>
        <FieldLabel htmlFor="source-api-token">API-токен панели{optional ? " (необязательно)" : ""}</FieldLabel>
        <Input id="source-api-token" type="password" autoComplete="off" placeholder="Токен доступа" {...register("apiToken")} />
        <FieldError errors={[errors.apiToken]} />
      </Field>
      {noCredentials && (
        <Alert>
          <InfoIcon />
          <AlertTitle>Данные панели не заданы</AlertTitle>
          <AlertDescription>
            Источник будет создан без учётных данных. Чтобы синхронизация заработала, на бэкенде отдельно (вне UI) нужно задать переменные окружения{" "}
            <code className="font-mono">{"{CODE}_BASE_URL"}</code> и <code className="font-mono">{"{CODE}_API_TOKEN"}</code> и перезапустить сервис — иначе
            синхронизация будет падать с ошибкой &laquo;Missing credentials&raquo;. Заполните оба поля выше, чтобы источник заработал сразу.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
