"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { CredentialsEditor, credentialsToRecord, type CredentialPair } from "@/features/payments/credentials-editor";

function apiErrorMessage(error: ApiError): string {
  if (error.status === 404) return "Шлюз не найден.";
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

export function RotateGatewayCredentialsDialog({ gatewayId, gatewayName }: { gatewayId: string; gatewayName: string }) {
  const [open, setOpen] = useState(false);
  const [pairs, setPairs] = useState<CredentialPair[]>([{ key: "", value: "" }]);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => adminApi.setPaymentGatewayCredentials(gatewayId, { credentials: credentialsToRecord(pairs) }),
    onSuccess: async () => {
      toast.success("Учётные данные обновлены.");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-payment-gateways"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось обновить учётные данные."),
  });

  const onOpenChange = (next: boolean) => {
    if (!next) setPairs([{ key: "", value: "" }]);
    setOpen(next);
  };

  const hasAnyKey = pairs.some((pair) => pair.key.trim());

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
          <DialogTitle>Обновить credentials — {gatewayName}</DialogTitle>
          <DialogDescription>Текущие значения не хранятся в открытом виде и никогда не возвращаются API — заполните все поля заново.</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <CredentialsEditor pairs={pairs} onChange={setPairs} />
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button disabled={!hasAnyKey || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
