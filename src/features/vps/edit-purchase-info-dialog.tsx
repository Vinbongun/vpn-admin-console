"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsInstance } from "@/api/types";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/country-flag";
import { CountrySearchSelect } from "@/components/country-search-select";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

const currencies = ["RUB", "USD"] as const;

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

function formFrom(vps: VpsInstance) {
  return {
    purchasedAt: vps.purchasedAt ? vps.purchasedAt.slice(0, 10) : "",
    expireDate: vps.expireDate ?? "",
    // Бэкенд хранит и принимает целые центы (purchaseCostCents) - здесь только отображение/ввод
    // в долларах с копейками для удобства staff, конвертация туда-обратно происходит только на
    // границе формы (см. formFrom()/mutationFn ниже), контракт с бэком не меняется.
    purchaseCostDollars: vps.purchaseCostCents != null ? (vps.purchaseCostCents / 100).toFixed(2) : "",
    currency: vps.currency ?? "",
    period: vps.period != null ? String(vps.period) : "",
    autoProlong: vps.autoProlong,
    datacenterCountryCode: vps.datacenterCountryCode ?? "",
    registrarAccountId: vps.registrarAccountId ?? "",
  };
}

export function EditPurchaseInfoDialog({ vps }: { vps: VpsInstance }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => formFrom(vps));
  const queryClient = useQueryClient();
  const isManual = vps.providerType === "MANUAL";
  const countries = useQuery({ queryKey: ["reference-countries"], queryFn: adminApi.listReferenceCountries, retry: false, enabled: open && isManual });
  // Purely informational for a MANUAL VPS - lets staff retroactively note which real registrar
  // account this server was actually bought through (not wired into automation/purchase-operations).
  const registrarAccounts = useQuery({ queryKey: ["admin-vps-registrar-accounts"], queryFn: adminApi.listVpsRegistrarAccounts, retry: false, enabled: open && isManual });

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateVpsInstanceMetadata(vps.id, {
        ...(form.purchasedAt ? { purchasedAt: new Date(`${form.purchasedAt}T00:00:00Z`).toISOString() } : {}),
        ...(form.expireDate ? { expireDate: form.expireDate } : {}),
        ...(form.purchaseCostDollars ? { purchaseCostCents: Math.round(Number(form.purchaseCostDollars) * 100) } : {}),
        ...(form.currency ? { currency: form.currency } : {}),
        ...(form.period ? { period: Number(form.period) } : {}),
        autoProlong: form.autoProlong,
        // Только для MANUAL - у API-купленного сервера локация всегда приходит от регистратора,
        // бэкенд сам отклонит попытку задать это поле для не-MANUAL (см. updateMetadata()).
        ...(isManual && form.datacenterCountryCode ? { datacenterCountryCode: form.datacenterCountryCode } : {}),
        ...(isManual && form.registrarAccountId ? { registrarAccountId: form.registrarAccountId } : {}),
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
            <Label htmlFor="edit-vps-cost">Стоимость</Label>
            <Input
              id="edit-vps-cost"
              type="number"
              min={0}
              step="0.01"
              value={form.purchaseCostDollars}
              onChange={(event) => setForm((prev) => ({ ...prev, purchaseCostDollars: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-vps-currency">Валюта</Label>
            <Select items={currencies.map((value) => ({ value, label: value }))} value={form.currency} onValueChange={(value) => setForm((prev) => ({ ...prev, currency: value ?? "" }))}>
              <SelectTrigger id="edit-vps-currency" className="w-full">
                <SelectValue placeholder="Выберите валюту" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Валюта</SelectLabel>
                  {currencies.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-vps-period">Период, мес.</Label>
            <Input id="edit-vps-period" type="number" min={1} value={form.period} onChange={(event) => setForm((prev) => ({ ...prev, period: event.target.value }))} />
          </div>
          <div className="flex items-center justify-between gap-2 pt-6">
            <Label htmlFor="edit-vps-auto-prolong">Авто-продление</Label>
            <Switch id="edit-vps-auto-prolong" checked={form.autoProlong} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, autoProlong: checked }))} />
          </div>
          {isManual && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-vps-registrar">Регистратор (задним числом)</Label>
              <Select
                items={[
                  { value: "", label: "Не указан" },
                  ...(registrarAccounts.data ?? []).map((account) => ({ value: account.id, label: account.code })),
                ]}
                value={form.registrarAccountId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, registrarAccountId: value ?? "" }))}
              >
                <SelectTrigger id="edit-vps-registrar" className="w-full">
                  <SelectValue placeholder="Не указан" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Регистратор</SelectLabel>
                    <SelectItem value="">Не указан</SelectItem>
                    {(registrarAccounts.data ?? []).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Чисто информационно — отмечает, у какого регистратора реально куплен сервер, не создаёт связь для автоматизации.</p>
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="edit-vps-country">Страна дата-центра</Label>
            {isManual ? (
              <CountrySearchSelect
                id="edit-vps-country"
                options={countries.data ?? []}
                value={form.datacenterCountryCode}
                onChange={(code) => setForm((prev) => ({ ...prev, datacenterCountryCode: code }))}
                loading={countries.isLoading}
              />
            ) : (
              <p className="flex h-9 items-center gap-1.5 text-sm text-muted-foreground">
                {vps.datacenterCountryCode ? (
                  <>
                    <CountryFlag code={vps.datacenterCountryCode} />
                    {vps.datacenterCountryName ?? vps.datacenterCountryCode}
                  </>
                ) : (
                  "—"
                )}
                <span className="text-xs">(задаётся регистратором при покупке)</span>
              </p>
            )}
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
