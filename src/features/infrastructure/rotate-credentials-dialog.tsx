"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { CredentialsFields } from "@/features/infrastructure/credentials-fields";
import { rotateCredentialsSchema, type RotateCredentialsValues } from "@/features/infrastructure/schema";

function apiErrorMessage(error: ApiError): string {
  if (error.status === 404) return "Панель не найдена.";
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

const defaultValues: RotateCredentialsValues = { baseUrl: "", apiToken: "" };

export function RotateCredentialsDialog({ sourceId, sourceCode, canAutoSync }: { sourceId: string; sourceCode: string; canAutoSync: boolean }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<RotateCredentialsValues>({ resolver: zodResolver(rotateCredentialsSchema), defaultValues });

  const syncMutation = useMutation({
    mutationFn: () => adminApi.syncSource(sourceId),
    onSuccess: async (result) => {
      toast.success(`Синхронизировано, найдено endpoint'ов: ${result.count}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-sources"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-endpoints"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-summary"] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось синхронизировать."),
  });

  const mutation = useMutation({
    mutationFn: (values: RotateCredentialsValues) => adminApi.setControlPlaneSourceCredentials(sourceId, values),
    onSuccess: async () => {
      form.reset(defaultValues);
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-infrastructure-sources"] });
      if (canAutoSync) {
        toast.success("Credentials обновлены.", { action: { label: "Синхронизировать", onClick: () => syncMutation.mutate() } });
      } else {
        toast.success(`Credentials для ${sourceCode} обновлены. Нажмите «Синхронизировать с панелью» и укажите код страны, чтобы проверить их.`);
      }
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось обновить credentials."),
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
          <Button size="sm" variant="outline">
            <KeyRoundIcon />
            Обновить credentials
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Обновить credentials — {sourceCode}</DialogTitle>
          <DialogDescription>
            Текущие значения не хранятся в открытом виде и никогда не возвращаются API, поэтому поля ниже всегда пустые — заполните оба заново.
          </DialogDescription>
        </DialogHeader>
        <form className="contents" onSubmit={submit}>
          <FieldGroup>
            <CredentialsFields form={form} optional={false} />
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending && <Spinner />}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
