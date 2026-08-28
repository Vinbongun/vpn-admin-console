"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsInstance } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formFrom(vps: VpsInstance) {
  return {
    purchasedAt: vps.purchasedAt ? vps.purchasedAt.slice(0, 10) : "",
    expireDate: vps.expireDate ?? "",
    purchaseCostCents: vps.purchaseCostCents != null ? String(vps.purchaseCostCents) : "",
    currency: vps.currency ?? "",
    period: vps.period != null ? String(vps.period) : "",
    autoProlong: vps.autoProlong,
  };
}

export function EditPurchaseInfoDialog({ vps }: { vps: VpsInstance }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => formFrom(vps));
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateVpsInstanceMetadata(vps.id, {
        ...(form.purchasedAt ? { purchasedAt: new Date(`${form.purchasedAt}T00:00:00Z`).toISOString() } : {}),
        ...(form.expireDate ? { expireDate: form.expireDate } : {}),
        ...(form.purchaseCostCents ? { purchaseCostCents: Number(form.purchaseCostCents) } : {}),
        ...(form.currency ? { currency: form.currency } : {}),
        ...(form.period ? { period: Number(form.period) } : {}),
        autoProlong: form.autoProlong,
      }),
    onSuccess: async () => {
      toast.success("Данные о покупке обновлены.");
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-vps-instances"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-vps-instance", vps.id] }),
      ]);
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось сохранить данные о покупке."),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setForm(formFrom(vps));
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <PencilIcon />
            Данные о покупке
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Данные о покупке — {vps.code}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-vps-purchased-at">Дата покупки</Label>
            <Input id="edit-vps-purchased-at" type="date" value={form.purchasedAt} onChange={(event) => setForm((prev) => ({ ...prev, purchasedAt: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-vps-expire-date">Дата истечения</Label>
            <Input id="edit-vps-expire-date" type="date" value={form.expireDate} onChange={(event) => setForm((prev) => ({ ...prev, expireDate: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-vps-cost">Стоимость, центы</Label>
            <Input id="edit-vps-cost" type="number" min={0} value={form.purchaseCostCents} onChange={(event) => setForm((prev) => ({ ...prev, purchaseCostCents: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-vps-currency">Валюта</Label>
            <Input id="edit-vps-currency" placeholder="USD" value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-vps-period">Период, мес.</Label>
            <Input id="edit-vps-period" type="number" min={1} value={form.period} onChange={(event) => setForm((prev) => ({ ...prev, period: event.target.value }))} />
          </div>
          <div className="flex items-center justify-between gap-2 pt-6">
            <Label htmlFor="edit-vps-auto-prolong">Авто-продление</Label>
            <Switch id="edit-vps-auto-prolong" checked={form.autoProlong} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, autoProlong: checked }))} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
