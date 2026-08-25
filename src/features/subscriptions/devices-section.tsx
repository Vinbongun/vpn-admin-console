"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InfoIcon, SmartphoneIcon } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/api/client";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function formatDate(value: string) {
  return new Date(value).toLocaleString("ru-RU");
}

export function DevicesSection({
  subscriptionId,
  deviceLimit,
  activeDeviceCount,
  activeDeviceCountCheckedAt,
  mayWrite,
}: {
  subscriptionId: string;
  deviceLimit?: number;
  activeDeviceCount?: number | null;
  activeDeviceCountCheckedAt?: string | null;
  mayWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const devices = useQuery({ queryKey: ["admin-subscription-devices", subscriptionId], queryFn: () => adminApi.listDevices(subscriptionId), retry: false });

  const removeMutation = useMutation({
    mutationFn: (deviceId: string) => adminApi.removeDevice(subscriptionId, deviceId),
    onSuccess: async () => {
      toast.success("Устройство отвязано.");
      await queryClient.invalidateQueries({ queryKey: ["admin-subscription-devices", subscriptionId] });
    },
    onError: () => toast.error("Не удалось отвязать устройство."),
  });

  const activeCount = devices.data?.filter((device) => device.status === "ACTIVE").length ?? 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Устройства</p>
        {deviceLimit !== undefined && (
          <span className="text-xs text-muted-foreground">
            {activeCount} / {deviceLimit}
          </span>
        )}
      </div>
      <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>
          {activeDeviceCount == null
            ? "Активные подключения: ещё не проверялось"
            : deviceLimit !== undefined
              ? `Активные подключения: ${activeDeviceCount} из ${deviceLimit}`
              : `Активные подключения: ${activeDeviceCount}`}
        </span>
        <Tooltip>
          <TooltipTrigger>
            <InfoIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>
            Эвристика «видели недавно» (окно в несколько минут) по данным фонового опроса раз в ~3 минуты — не точный счётчик одновременных сессий, ни одна панель такого не отдаёт.
          </TooltipContent>
        </Tooltip>
        {activeDeviceCountCheckedAt && <span>· обновлено {formatDate(activeDeviceCountCheckedAt)}</span>}
      </div>
      {devices.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : devices.isError ? (
        <ErrorState description="Не удалось получить устройства." />
      ) : !devices.data || devices.data.length === 0 ? (
        <EmptyState title="Устройств нет" icon={SmartphoneIcon} />
      ) : (
        <div className="space-y-2">
          {devices.data.map((device) => (
            <div key={device.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{device.label || device.hwid}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {device.hwid} · впервые {formatDate(device.firstSeenAt)} · активно {formatDate(device.lastSeenAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={device.status} />
                {mayWrite && device.status === "ACTIVE" && (
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="outline" disabled={removeMutation.isPending}>
                        Отвязать
                      </Button>
                    }
                    title="Отвязать устройство?"
                    description="Устройство потеряет доступ по этой подписке, а освободившийся слот можно будет использовать для нового устройства."
                    confirmLabel="Отвязать"
                    isPending={removeMutation.isPending}
                    onConfirm={() => removeMutation.mutate(device.id)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
