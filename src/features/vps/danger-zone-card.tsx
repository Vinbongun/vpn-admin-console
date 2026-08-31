"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsInstance } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TypedConfirmDialog } from "@/features/vps/typed-confirm-dialog";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

/** Списание сервера (decommission) убрано из этой карточки по требованию владельца - сама
 *  задача/permission на бэке никуда не делись, просто больше не вызываются из этого UI. */
export function DangerZoneCard({ vps, mayWrite }: { vps: VpsInstance; mayWrite: boolean }) {
  const queryClient = useQueryClient();

  const bootstrapMutation = useMutation({
    mutationFn: () => adminApi.bootstrapVpsInstance(vps.id),
    onSuccess: () => {
      toast.success("Задача настройки поставлена.");
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["admin-vps-instance", vps.id] }), 4000);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось поставить задачу настройки."),
  });

  const reinstallMutation = useMutation({
    mutationFn: () => {
      if (!vps.registrarAccountId || !vps.registrarItemRef) throw new Error("Нет данных регистратора для этого сервера.");
      return adminApi.reinstallVpsServer(vps.registrarAccountId, vps.registrarItemRef);
    },
    onSuccess: () => toast.success("Переустановка ОС запрошена."),
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось запросить переустановку ОС."),
  });

  if (!mayWrite) return null;

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>Опасные операции</CardTitle>
        <CardDescription>Требуют ввода текста вручную для подтверждения — случайный клик их не запустит.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Настройка сервера с нуля</p>
            <p className="text-xs text-muted-foreground">
              apt upgrade, Docker, файрвол, fail2ban, отключение входа по паролю — базовая настройка чистого сервера. Безопасно
              запускать повторно, не ломает уже настроенный сервер.
            </p>
          </div>
          <TypedConfirmDialog
            trigger={
              <Button size="sm" variant="outline">
                Настроить
              </Button>
            }
            title={`Настроить ${vps.code} с нуля?`}
            description={
              <>
                Выполнит базовую настройку сервера (обновления, Docker, файрвол, fail2ban). Чтобы подтвердить, введите код
                сервера — <span className="font-mono">{vps.code}</span>.
              </>
            }
            confirmWord={vps.code}
            confirmLabel="Настроить"
            isPending={bootstrapMutation.isPending}
            onConfirm={() => bootstrapMutation.mutate()}
          />
        </div>

        {vps.providerType !== "MANUAL" && vps.registrarAccountId && vps.registrarItemRef && (
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Переустановить ОС</p>
              <p className="text-xs text-muted-foreground">
                Полностью стирает сервер и ставит систему заново — все данные и текущая настройка теряются безвозвратно.
                Сейчас не работает: реальная функция BILLmanager для этого действия ещё не подтверждена, бэкенд честно
                откажет с понятной ошибкой вместо угадывания.
              </p>
            </div>
            <TypedConfirmDialog
              trigger={
                <Button size="sm" variant="destructive">
                  Переустановить
                </Button>
              }
              title={`Переустановить ОС на ${vps.code}?`}
              description={
                <>
                  Стирает сервер полностью и ставит ОС заново — необратимо. Чтобы подтвердить, введите код сервера —{" "}
                  <span className="font-mono">{vps.code}</span>.
                </>
              }
              confirmWord={vps.code}
              confirmLabel="Переустановить"
              isPending={reinstallMutation.isPending}
              onConfirm={() => reinstallMutation.mutate()}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
