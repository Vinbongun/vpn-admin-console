"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { VpsInstance } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

export function InstallRemnawaveNodeDialog({ vps }: { vps: VpsInstance }) {
  const [open, setOpen] = useState(false);
  const [panelSourceId, setPanelSourceId] = useState("");
  const [configProfileUuid, setConfigProfileUuid] = useState("");
  const [activeInboundUuids, setActiveInboundUuids] = useState<string[]>([]);
  const [countryCode, setCountryCode] = useState("");
  const [name, setName] = useState("");
  const [port, setPort] = useState("2222");
  const queryClient = useQueryClient();

  const reset = () => {
    setPanelSourceId("");
    setConfigProfileUuid("");
    setActiveInboundUuids([]);
    setCountryCode("");
    setName("");
    setPort("2222");
  };

  const sources = useQuery({ queryKey: ["admin-infrastructure-sources"], queryFn: adminApi.listControlPlaneSources, retry: false, enabled: open });
  const remnawavePanels = (sources.data ?? []).filter((source) => source.providerType === "REMNAWAVE");

  const profiles = useQuery({
    queryKey: ["admin-source-config-profiles", panelSourceId],
    queryFn: () => adminApi.listControlPlaneSourceConfigProfiles(panelSourceId),
    enabled: open && Boolean(panelSourceId),
    retry: false,
  });
  const selectedProfile = profiles.data?.find((profile) => profile.uuid === configProfileUuid);

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.installRemnawaveNodeOnVpsInstance(vps.id, {
        panelSourceId,
        configProfileUuid,
        activeInboundUuids,
        countryCode: countryCode.trim().toUpperCase(),
        port: Number(port) || 2222,
        ...(name.trim() ? { name: name.trim() } : {}),
      }),
    onSuccess: async () => {
      toast.success("Задача подключения ноды поставлена.");
      setOpen(false);
      reset();
      await queryClient.invalidateQueries({ queryKey: ["admin-vps-instance", vps.id] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось поставить задачу подключения ноды."),
  });

  const toggleInbound = (uuid: string) => setActiveInboundUuids((prev) => (prev.includes(uuid) ? prev.filter((value) => value !== uuid) : [...prev, uuid]));

  const canSubmit = Boolean(panelSourceId && configProfileUuid && activeInboundUuids.length > 0 && /^[A-Za-z]{2}$/.test(countryCode.trim())) && !mutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Присоединить как ноду Remnawave</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Присоединить {vps.code} как ноду Remnawave</DialogTitle>
          <DialogDescription>Сервер подключится к уже существующей панели — не является самостоятельной установкой панели.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="space-y-2">
            <Label>Панель</Label>
            {sources.isLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка панелей…</p>
            ) : remnawavePanels.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет ни одной панели Remnawave.</p>
            ) : (
              <Select
                items={remnawavePanels.map((source) => ({ value: source.id, label: source.code }))}
                value={panelSourceId}
                onValueChange={(value) => {
                  setPanelSourceId(value ?? "");
                  setConfigProfileUuid("");
                  setActiveInboundUuids([]);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите панель" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Панель</SelectLabel>
                    {remnawavePanels.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.code}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>

          {panelSourceId && (
            <div className="space-y-2">
              <Label>Config-profile</Label>
              {profiles.isLoading ? (
                <p className="text-sm text-muted-foreground">Загрузка профилей…</p>
              ) : !profiles.data || profiles.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">На этой панели нет config-profile.</p>
              ) : (
                <Select
                  items={profiles.data.map((profile) => ({ value: profile.uuid, label: profile.name }))}
                  value={configProfileUuid}
                  onValueChange={(value) => {
                    setConfigProfileUuid(value ?? "");
                    setActiveInboundUuids([]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите config-profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Config-profile</SelectLabel>
                      {profiles.data.map((profile) => (
                        <SelectItem key={profile.uuid} value={profile.uuid}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {selectedProfile && (
            <div className="space-y-2">
              <Label>{"Inbound'ы"}</Label>
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border p-2">
                {selectedProfile.inbounds.map((inbound) => (
                  <label key={inbound.uuid} className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-accent">
                    <Checkbox checked={activeInboundUuids.includes(inbound.uuid)} onCheckedChange={() => toggleInbound(inbound.uuid)} />
                    {inbound.tag} <span className="text-xs text-muted-foreground">({inbound.type})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="remnawave-node-country">Страна (2 буквы)</Label>
              <Input id="remnawave-node-country" placeholder="NL" maxLength={2} value={countryCode} onChange={(event) => setCountryCode(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remnawave-node-port">Порт</Label>
              <Input id="remnawave-node-port" type="number" value={port} onChange={(event) => setPort(event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="remnawave-node-name">Название (необязательно)</Label>
            <Input id="remnawave-node-name" placeholder={vps.code} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
          <Button disabled={!canSubmit} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Spinner />}
            Присоединить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
