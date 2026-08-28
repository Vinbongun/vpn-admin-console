"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

function apiErrorMessage(error: ApiError): string {
  if (error.status === 409) return "VPS с таким кодом уже существует.";
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

const emptyForm = {
  code: "",
  host: "",
  sshPort: "22",
  sshUser: "root",
  sshCredential: "",
  controlPlaneSourceId: "",
  purchasedAt: "",
  purchaseCostCents: "",
  currency: "USD",
  period: "",
  autoProlong: true,
  expireDate: "",
};

export function AddVpsDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const sources = useQuery({ queryKey: ["admin-infrastructure-sources"], queryFn: adminApi.listControlPlaneSources, retry: false, enabled: open });

  const reset = () => setForm(emptyForm);

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.registerVpsInstance({
        code: form.code.trim(),
        host: form.host.trim(),
        sshPort: Number(form.sshPort) || 22,
        sshUser: form.sshUser.trim(),
        sshCredential: form.sshCredential,
        ...(form.controlPlaneSourceId ? { controlPlaneSourceId: form.controlPlaneSourceId } : {}),
        ...(form.purchasedAt ? { purchasedAt: new Date(`${form.purchasedAt}T00:00:00Z`).toISOString() } : {}),
        ...(form.purchaseCostCents ? { purchaseCostCents: Number(form.purchaseCostCents) } : {}),
        ...(form.currency ? { currency: form.currency } : {}),
        ...(form.period ? { period: Number(form.period) } : {}),
        autoProlong: form.autoProlong,
        ...(form.expireDate ? { expireDate: form.expireDate } : {}),
      }),
    onSuccess: async () => {
      toast.success("VPS добавлен.");
      setOpen(false);
      reset();
      await queryClient.invalidateQueries({ queryKey: ["admin-vps-instances"] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось добавить VPS."),
  });

  const canSubmit = Boolean(form.code.trim() && form.host.trim() && form.sshUser.trim() && form.sshCredential) && !mutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="secondary">
            <PlusIcon />
            Добавить VPS
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Добавить VPS вручную</DialogTitle>
          <DialogDescription>SSH-доступ сохраняется в защищённое хранилище и нигде не возвращается. Данные о покупке необязательны — можно заполнить позже.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vps-code">Код</Label>
              <Input id="vps-code" placeholder="fr-paris-3" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vps-host">Хост (IP)</Label>
              <Input id="vps-host" placeholder="1.2.3.4" value={form.host} onChange={(event) => setForm((prev) => ({ ...prev, host: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vps-ssh-user">SSH-пользователь</Label>
              <Input id="vps-ssh-user" value={form.sshUser} onChange={(event) => setForm((prev) => ({ ...prev, sshUser: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vps-ssh-port">SSH-порт</Label>
              <Input id="vps-ssh-port" type="number" min={1} max={65535} value={form.sshPort} onChange={(event) => setForm((prev) => ({ ...prev, sshPort: event.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vps-ssh-credential">SSH-ключ или пароль</Label>
            <Textarea
              id="vps-ssh-credential"
              rows={3}
              placeholder="Приватный ключ (или пароль для первого подключения)"
              value={form.sshCredential}
              onChange={(event) => setForm((prev) => ({ ...prev, sshCredential: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Панель (необязательно)</Label>
            <Select
              items={[{ value: "none", label: "Без панели" }, ...(sources.data?.map((source) => ({ value: source.id, label: source.code })) ?? [])]}
              value={form.controlPlaneSourceId || "none"}
              onValueChange={(value) => setForm((prev) => ({ ...prev, controlPlaneSourceId: value === "none" ? "" : (value ?? "") }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Панель</SelectLabel>
                  <SelectItem value="none">Без панели</SelectItem>
                  {sources.data?.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.code}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Данные о покупке (необязательно)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vps-purchased-at">Дата покупки</Label>
                <Input id="vps-purchased-at" type="date" value={form.purchasedAt} onChange={(event) => setForm((prev) => ({ ...prev, purchasedAt: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vps-expire-date">Дата истечения</Label>
                <Input id="vps-expire-date" type="date" value={form.expireDate} onChange={(event) => setForm((prev) => ({ ...prev, expireDate: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vps-cost">Стоимость, центы</Label>
                <Input id="vps-cost" type="number" min={0} value={form.purchaseCostCents} onChange={(event) => setForm((prev) => ({ ...prev, purchaseCostCents: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vps-currency">Валюта</Label>
                <Input id="vps-currency" placeholder="USD" value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vps-period">Период, мес.</Label>
                <Input id="vps-period" type="number" min={1} value={form.period} onChange={(event) => setForm((prev) => ({ ...prev, period: event.target.value }))} />
              </div>
              <div className="flex items-center justify-between gap-2 pt-6">
                <Label htmlFor="vps-auto-prolong">Авто-продление</Label>
                <Switch id="vps-auto-prolong" checked={form.autoProlong} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, autoProlong: checked }))} />
              </div>
            </div>
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
