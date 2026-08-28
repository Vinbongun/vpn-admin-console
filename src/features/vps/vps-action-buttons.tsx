"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsAutomationJobRef, VpsInstance } from "@/api/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DecommissionDialog } from "@/features/vps/decommission-dialog";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

type JobAction = {
  label: string;
  run: (id: string) => Promise<VpsAutomationJobRef>;
  // start/stop touch running services (fully reversible) - a plain confirm dialog is enough, per the
  // backend's own operation docs. The other jobs (bootstrap/test/health-check/update/backup) fire straight away.
  confirm?: boolean;
};

const jobActions: JobAction[] = [
  { label: "Bootstrap", run: adminApi.bootstrapVpsInstance },
  { label: "Тест", run: adminApi.testVpsInstance },
  { label: "Health-check", run: adminApi.healthCheckVpsInstance },
  { label: "Обновить", run: adminApi.runVpsInstanceUpdate },
  { label: "Бэкап", run: adminApi.backupVpsInstance },
  { label: "Запустить", run: adminApi.startVpsServices, confirm: true },
  { label: "Остановить", run: adminApi.stopVpsServices, confirm: true },
];

export function VpsActionButtons({ vps, mayWrite, mayDecommission }: { vps: VpsInstance; mayWrite: boolean; mayDecommission: boolean }) {
  const queryClient = useQueryClient();
  const [pendingLabel, setPendingLabel] = useState<string>();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-vps-instances"] });
    queryClient.invalidateQueries({ queryKey: ["admin-vps-instance", vps.id] });
  };

  const jobMutation = useMutation({
    mutationFn: (action: JobAction) => action.run(vps.id),
    onMutate: (action) => setPendingLabel(action.label),
    onSuccess: () => {
      toast.success("Задача поставлена.");
      // Jobs run asynchronously on the VPS via Ansible - there's no job-status GET to poll, so
      // just refresh once after a few seconds and leave a manual refresh button for slower jobs.
      setTimeout(refresh, 4000);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось поставить задачу."),
    onSettled: () => setPendingLabel(undefined),
  });

  if (!mayWrite) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
      {jobActions.map((action) =>
        action.confirm ? (
          <ConfirmDialog
            key={action.label}
            trigger={
              <Button size="sm" variant="outline" disabled={jobMutation.isPending}>
                {pendingLabel === action.label && <Spinner />}
                {action.label}
              </Button>
            }
            title={`${action.label}?`}
            description={`Выполнить «${action.label}» на ${vps.code} (${vps.host})? Действие полностью обратимо.`}
            confirmLabel={action.label}
            destructive={false}
            isPending={pendingLabel === action.label}
            onConfirm={() => jobMutation.mutate(action)}
          />
        ) : (
          <Button key={action.label} size="sm" variant="outline" disabled={jobMutation.isPending} onClick={() => jobMutation.mutate(action)}>
            {pendingLabel === action.label && <Spinner />}
            {action.label}
          </Button>
        ),
      )}
      <Button size="icon-sm" variant="ghost" title="Обновить статус" onClick={refresh}>
        <RefreshCwIcon />
      </Button>
      {mayDecommission && <DecommissionDialog vps={vps} />}
    </div>
  );
}
