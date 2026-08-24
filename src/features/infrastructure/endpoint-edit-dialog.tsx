"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InfoIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { InfrastructureEndpointSummary } from "@/api/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { healthStatuses, updateEndpointSchema, type UpdateEndpointValues } from "@/features/infrastructure/schema";
import { flagEmoji } from "@/lib/flag-emoji";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—";
}

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

export function EndpointEditDialog({
  endpoint,
  onOpenChange,
  mayWrite,
}: {
  endpoint: InfrastructureEndpointSummary | undefined;
  onOpenChange: (open: boolean) => void;
  mayWrite: boolean;
}) {
  return (
    <Dialog open={Boolean(endpoint)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{endpoint && <EndpointEditBody key={endpoint.id} endpoint={endpoint} mayWrite={mayWrite} onClose={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function EndpointEditBody({ endpoint, mayWrite, onClose }: { endpoint: InfrastructureEndpointSummary; mayWrite: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<UpdateEndpointValues>({
    resolver: zodResolver(updateEndpointSchema),
    defaultValues: {
      healthStatus: endpoint.healthStatus as UpdateEndpointValues["healthStatus"],
      comment: endpoint.comment ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: UpdateEndpointValues) => adminApi.updateInfrastructureEndpoint(endpoint.id, values),
    onSuccess: async () => {
      toast.success("Endpoint обновлён.");
      onClose();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-endpoints"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-endpoints-all"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось обновить endpoint."),
  });

  const submit = form.handleSubmit((values) => mutation.mutate(values));
  const flag = flagEmoji(endpoint.countryCode);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{endpoint.name}</DialogTitle>
        <DialogDescription>{endpoint.sourceCode}</DialogDescription>
      </DialogHeader>
      <form className="contents" onSubmit={submit}>
        <FieldGroup>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Локация</dt>
            <dd>
              {flag && <span className="mr-1">{flag}</span>}
              {[endpoint.countryCode, endpoint.city].filter(Boolean).join(" · ") || "—"}
            </dd>
            <dt className="text-muted-foreground">Протокол</dt>
            <dd>{endpoint.protocol + (endpoint.transport ? ` · ${endpoint.transport}` : "")}</dd>
            <dt className="text-muted-foreground">Последний трафик</dt>
            <dd>{formatDate(endpoint.lastSeenAt)}</dd>
            <dt className="text-muted-foreground">Последняя проверка</dt>
            <dd>{formatDate(endpoint.lastProbeAt)}</dd>
          </dl>

          <Alert>
            <InfoIcon />
            <AlertTitle>Название, локация и протокол не редактируются</AlertTitle>
            <AlertDescription>Каждая синхронизация источника перезаписывает эти поля свежими данными с панели — правка через UI была бы обманчивой и next sync её молча откатит.</AlertDescription>
          </Alert>

          <Controller
            control={form.control}
            name="healthStatus"
            render={({ field, fieldState }) => (
              <Field data-invalid={Boolean(fieldState.error)}>
                <FieldLabel htmlFor="endpoint-edit-health">Здоровье (ручной override)</FieldLabel>
                <Select disabled={!mayWrite} items={healthStatuses.map((value) => ({ value, label: value }))} value={field.value} onValueChange={(value) => field.onChange(value ?? endpoint.healthStatus)}>
                  <SelectTrigger id="endpoint-edit-health" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {healthStatuses.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Field data-invalid={Boolean(form.formState.errors.comment)}>
            <FieldLabel htmlFor="endpoint-edit-comment">Комментарий</FieldLabel>
            <Textarea id="endpoint-edit-comment" disabled={!mayWrite} rows={3} {...form.register("comment")} />
            <FieldError errors={[form.formState.errors.comment]} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Закрыть</DialogClose>
          {mayWrite && (
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending && <Spinner />}
              Сохранить
            </Button>
          )}
        </DialogFooter>
      </form>
    </>
  );
}
