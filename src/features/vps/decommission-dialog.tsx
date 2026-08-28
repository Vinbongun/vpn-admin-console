"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsInstance } from "@/api/types";
import { Button } from "@/components/ui/button";
import { TypedConfirmDialog } from "@/features/vps/typed-confirm-dialog";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

export function DecommissionDialog({ vps }: { vps: VpsInstance }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    // No request body - the backend enqueues the job on the id alone; the typed host below is a
    // frontend-only safety gate, mirroring confirm_decommission at the Ansible layer.
    mutationFn: () => adminApi.decommissionVpsInstance(vps.id),
    onSuccess: async () => {
      toast.success("Задача списания поставлена.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-vps-instances"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-vps-instance", vps.id] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось поставить задачу списания."),
  });

  return (
    <TypedConfirmDialog
      trigger={<Button size="sm" variant="destructive">Списать</Button>}
      title={`Списать ${vps.code}?`}
      description={
        <>
          Останавливает Docker на сервере и ставит локальный маркер — это не отменяет аренду у хостера/регистратора,
          сервер продолжает стоить денег, пока вы не отмените её там отдельно. Чтобы подтвердить, введите хост
          сервера — <span className="font-mono">{vps.host}</span>.
        </>
      }
      confirmWord={vps.host}
      confirmLabel="Списать"
      isPending={mutation.isPending}
      onConfirm={() => mutation.mutate()}
    />
  );
}
