"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsInstance } from "@/api/types";
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

export function DecommissionDialog({ vps }: { vps: VpsInstance }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    // No request body - the backend enqueues the job on the id alone; the typed host below is a
    // frontend-only safety gate, mirroring confirm_decommission at the Ansible layer.
    mutationFn: () => adminApi.decommissionVpsInstance(vps.id),
    onSuccess: async () => {
      toast.success("Задача списания поставлена.");
      setOpen(false);
      setConfirmText("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-vps-instances"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-vps-instance", vps.id] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось поставить задачу списания."),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmText("");
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="destructive" />}>Списать</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Списать {vps.code}?</DialogTitle>
          <DialogDescription>
            Разрушительная операция. Чтобы подтвердить, введите хост сервера — <span className="font-mono">{vps.host}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="decommission-confirm">Хост сервера</Label>
          <Input id="decommission-confirm" value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder={vps.host} />
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button variant="destructive" disabled={confirmText !== vps.host || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            Списать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
