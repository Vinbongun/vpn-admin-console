"use client";

import { useMutation } from "@tanstack/react-query";
import { KeyRoundIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

export function RotateRegistrarCredentialsDialog({ accountId, accountCode }: { accountId: string; accountCode: string }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => adminApi.updateVpsRegistrarCredentials(accountId, { username, password }),
    onSuccess: () => {
      toast.success(`Credentials для ${accountCode} обновлены.`);
      setOpen(false);
      setUsername("");
      setPassword("");
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось обновить credentials."),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setUsername("");
          setPassword("");
        }
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <KeyRoundIcon />
            Обновить credentials
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Обновить credentials — {accountCode}</DialogTitle>
          <DialogDescription>Текущие значения нигде не хранятся в открытом виде — заполните оба поля заново.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="space-y-2">
            <Label htmlFor="rotate-registrar-username">Логин</Label>
            <Input id="rotate-registrar-username" value={username} onChange={(event) => setUsername(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rotate-registrar-password">Пароль</Label>
            <Input id="rotate-registrar-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button disabled={!username || !password || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
