"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { PlatformSetting, RateLimitValue } from "@/api/types";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { SettingMeta } from "@/features/platform-settings/settings-metadata";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function inBounds(value: number, [min, max]: [number, number]) {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function PlatformSettingCard({ meta, setting, mayWrite }: { meta: SettingMeta; setting: PlatformSetting; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const currentRateLimit = meta.kind === "rate_limit" ? (setting.value as RateLimitValue) : undefined;
  const currentScalar = meta.kind === "scalar" ? (setting.value as number) : undefined;
  const [limitInput, setLimitInput] = useState(String(currentRateLimit?.limit ?? ""));
  const [windowInput, setWindowInput] = useState(String(currentRateLimit?.windowSeconds ?? ""));
  const [scalarInput, setScalarInput] = useState(String(currentScalar ?? ""));

  const mutation = useMutation({
    mutationFn: (value: RateLimitValue | number) => adminApi.updatePlatformSetting(meta.key, { value }),
    onSuccess: async () => {
      setIsEditing(false);
      toast.success("Настройка обновлена.");
      await queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось обновить настройку."),
  });

  const startEdit = () => {
    setLimitInput(String(currentRateLimit?.limit ?? ""));
    setWindowInput(String(currentRateLimit?.windowSeconds ?? ""));
    setScalarInput(String(currentScalar ?? ""));
    setIsEditing(true);
  };

  const limit = Number(limitInput);
  const windowSeconds = Number(windowInput);
  const scalar = Number(scalarInput);
  const isValid =
    meta.kind === "rate_limit"
      ? inBounds(limit, meta.limitBounds) && inBounds(windowSeconds, meta.windowBounds)
      : meta.kind === "scalar"
        ? inBounds(scalar, meta.bounds)
        : true; // readonly_text - never edited, nothing to validate

  const save = () => {
    if (!isValid) return;
    if (meta.kind === "rate_limit") mutation.mutate({ limit, windowSeconds });
    else if (meta.kind === "scalar") mutation.mutate(scalar);
  };

  // Read-only by design (see settings-metadata.ts) - no edit affordance at all, regardless of
  // mayWrite. Rotating this key means re-deploying it to every managed server; that's a
  // separate, more involved task the owner explicitly did not ask for here.
  if (meta.kind === "readonly_text") {
    const value = String(setting.value);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{meta.label}</CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted/30 px-3 py-2 text-xs">{value}</code>
            <CopyButton value={value} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{meta.label}</CardTitle>
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="flex flex-wrap items-end gap-3">
            {meta.kind === "rate_limit" ? (
              <>
                <div className="space-y-1">
                  <Label>Лимит попыток</Label>
                  <Input
                    type="number"
                    className="w-28"
                    value={limitInput}
                    onChange={(event) => setLimitInput(event.target.value)}
                    min={meta.limitBounds[0]}
                    max={meta.limitBounds[1]}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Окно, сек</Label>
                  <Input
                    type="number"
                    className="w-28"
                    value={windowInput}
                    onChange={(event) => setWindowInput(event.target.value)}
                    min={meta.windowBounds[0]}
                    max={meta.windowBounds[1]}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label>Значение, {meta.unit}</Label>
                <Input type="number" className="w-28" value={scalarInput} onChange={(event) => setScalarInput(event.target.value)} min={meta.bounds[0]} max={meta.bounds[1]} />
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" disabled={!isValid || mutation.isPending} onClick={save}>
                {mutation.isPending && <Spinner />}
                Сохранить
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                Отмена
              </Button>
            </div>
            {!isValid && (
              <p className="w-full text-xs text-destructive">
                {meta.kind === "rate_limit"
                  ? `Лимит: целое ${meta.limitBounds[0]}–${meta.limitBounds[1]}, окно: целое ${meta.windowBounds[0]}–${meta.windowBounds[1]} сек.`
                  : `Допустимо целое число ${meta.bounds[0]}–${meta.bounds[1]}.`}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                {meta.kind === "rate_limit"
                  ? `${currentRateLimit?.limit} попыток за ${currentRateLimit?.windowSeconds} сек`
                  : `${currentScalar} ${meta.unit}`}
              </p>
              {setting.updatedBy && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Изменено {new Date(setting.updatedAt).toLocaleString("ru-RU")}, сотрудник {setting.updatedBy}
                </p>
              )}
            </div>
            {mayWrite && (
              <Button size="sm" variant="outline" onClick={startEdit}>
                Изменить
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
