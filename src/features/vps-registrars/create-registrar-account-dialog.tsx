"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

function apiErrorMessage(error: ApiError): string {
  if (error.status === 409) return "Аккаунт с таким кодом уже существует.";
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

const emptyForm = { code: "", username: "", password: "" };

export function CreateRegistrarAccountDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    // providerType is currently locked to "QWINS" on the backend - the only real VPS-registrar
    // integration that exists today. A provider Select belongs here once a second one ships.
    mutationFn: () => adminApi.createVpsRegistrarAccount({ code: form.code.trim(), providerType: "QWINS", username: form.username.trim(), password: form.password }),
    onSuccess: async () => {
      toast.success("Аккаунт регистратора добавлен.");
      setOpen(false);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["admin-vps-registrar-accounts"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось добавить аккаунт."),
  });

  const canSubmit = Boolean(form.code.trim() && form.username.trim() && form.password) && !mutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setForm(emptyForm);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon />
            Добавить аккаунт регистратора
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Добавить аккаунт регистратора</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="space-y-2">
            <Label htmlFor="registrar-code">Код</Label>
            <Input id="registrar-code" placeholder="Например main" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrar-username">Логин</Label>
            <Input id="registrar-username" value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrar-password">Пароль</Label>
            <Input id="registrar-password" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button disabled={!canSubmit} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
