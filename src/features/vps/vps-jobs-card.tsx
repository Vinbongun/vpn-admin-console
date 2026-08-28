"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsAutomationJobRef, VpsInstance } from "@/api/types";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

type JobButton = { label: string; description: string; run: (id: string) => Promise<VpsAutomationJobRef> };

// "Без подтверждения" - читают состояние или пишут данные, не трогая сервисы клиентов.
const quickJobs: JobButton[] = [
  { label: "Health-check", description: "Дешёвая проверка: load average, диск, порты, контейнеры. Уже гоняется фоном каждые 10-15 мин.", run: adminApi.healthCheckVpsInstance },
  { label: "Бэкап", description: "Локальный бэкап конфигурации сервера (не БД) — sshd/fail2ban/sysctl/ufw/docker/crontab.", run: adminApi.backupVpsInstance },
  { label: "Запустить", description: "SSH-уровневый запуск Docker-контейнеров на сервере.", run: adminApi.startVpsServices },
];

// "Средние" - плановое обслуживание или временно затрагивает работающих клиентов, обычного попапа достаточно.
const maintenanceJobs: JobButton[] = [
  { label: "Тест", description: "Нагрузочный бенчмарк (YABS/GeoCheck/iPerf3) — временно нагружает канал сервера.", run: adminApi.testVpsInstance },
  { label: "Обновить", description: "apt dist-upgrade, при необходимости перезагрузка.", run: adminApi.runVpsInstanceUpdate },
  { label: "Остановить", description: "Останавливает Docker-контейнеры — все клиенты на этом сервере отключатся, пока не нажмёте «Запустить».", run: adminApi.stopVpsServices },
];

function useJobMutation(vps: VpsInstance) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (job: JobButton) => job.run(vps.id),
    onSuccess: () => {
      toast.success("Задача поставлена.");
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["admin-vps-instance", vps.id] }), 4000);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось поставить задачу."),
  });
}

export function VpsJobsCard({ vps, mayWrite }: { vps: VpsInstance; mayWrite: boolean }) {
  const quickMutation = useJobMutation(vps);
  const maintenanceMutation = useJobMutation(vps);

  if (!mayWrite) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
          <CardDescription>Без подтверждения — безопасно нажимать.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {quickJobs.map((job) => (
            <div key={job.label} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{job.label}</p>
                <p className="text-xs text-muted-foreground">{job.description}</p>
              </div>
              <Button size="sm" variant="outline" disabled={quickMutation.isPending} onClick={() => quickMutation.mutate(job)}>
                {quickMutation.isPending && quickMutation.variables?.label === job.label && <Spinner />}
                {job.label}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Обслуживание</CardTitle>
          <CardDescription>Временно затрагивает сервер или клиентов — обычное подтверждение.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {maintenanceJobs.map((job) => (
            <div key={job.label} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{job.label}</p>
                <p className="text-xs text-muted-foreground">{job.description}</p>
              </div>
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="outline">
                    {job.label}
                  </Button>
                }
                title={`${job.label}?`}
                description={job.description}
                confirmLabel={job.label}
                destructive={false}
                isPending={maintenanceMutation.isPending && maintenanceMutation.variables?.label === job.label}
                onConfirm={() => maintenanceMutation.mutate(job)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
