"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, ApiError } from "@/api/client";
import type { BrandDetail, EndpointGroupListItem } from "@/api/types";
import { DataTable } from "@/components/data-table";
import { EndpointName } from "@/components/endpoint-name";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { EndpointEditDialog } from "@/features/infrastructure/endpoint-edit-dialog";
import { can } from "@/lib/access-control";

function apiErrorMessage(error: ApiError): string {
  const details = error.details as { message?: string | string[] } | undefined;
  const message = details?.message;
  return (Array.isArray(message) ? message.join(", ") : message) ?? error.message;
}

export function BrandPackagesSection({ brand, mayWrite }: { brand: BrandDetail; mayWrite: boolean }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>();
  const [newGroup, setNewGroup] = useState({ code: "", name: "", routeClass: "" });
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayEditEndpoints = can(staff.data, "infrastructure.write");
  const groups = useQuery({ queryKey: ["admin-endpoint-groups", brand.id], queryFn: () => adminApi.listEndpointGroups({ brandId: brand.id }), retry: false });
  const detail = useQuery({ queryKey: ["admin-endpoint-group", selectedId], queryFn: () => adminApi.getEndpointGroup(selectedId!), enabled: Boolean(selectedId), retry: false });
  const endpoints = useQuery({ queryKey: ["admin-infrastructure-endpoints-all"], queryFn: () => adminApi.listInfrastructureEndpoints({ page: 1, pageSize: 100 }), retry: false });
  const plans = useQuery({ queryKey: ["admin-brand-plans", brand.id], queryFn: () => adminApi.listPlans({ brandCode: brand.code, pageSize: 100 }), retry: false });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createEndpointGroup({ brandId: brand.id, code: newGroup.code, name: newGroup.name, ...(newGroup.routeClass ? { routeClass: newGroup.routeClass } : {}) }),
    onSuccess: async () => {
      setNewGroup({ code: "", name: "", routeClass: "" });
      setCreateOpen(false);
      toast.success("Пакет создан.");
      await queryClient.invalidateQueries({ queryKey: ["admin-endpoint-groups", brand.id] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? apiErrorMessage(error) : "Не удалось создать пакет."),
  });
  const membersMutation = useMutation({
    mutationFn: (endpointIds: string[]) => adminApi.replaceEndpointGroupMembers(selectedId!, { endpointIds }),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-endpoint-group", selectedId] }), queryClient.invalidateQueries({ queryKey: ["admin-endpoint-groups", brand.id] })]);
    },
    onError: () => toast.error("Не удалось обновить состав пакета."),
  });
  const plansMutation = useMutation({
    mutationFn: (planIds: string[]) => adminApi.replaceEndpointGroupPlans(selectedId!, { planIds }),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin-endpoint-group", selectedId] }), queryClient.invalidateQueries({ queryKey: ["admin-endpoint-groups", brand.id] })]);
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError && error.status === 400
          ? "Этот тариф принадлежит другому бренду и не может получить доступ к пакету."
          : "Не удалось обновить доступ тарифов.",
      ),
  });

  const memberIds = new Set(detail.data?.endpoints.map((endpoint) => endpoint.id));
  const planIds = new Set(detail.data?.plans.map((plan) => plan.id));

  const toggleMember = (id: string) => {
    const next = new Set(memberIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    membersMutation.mutate([...next]);
  };
  const togglePlan = (id: string) => {
    const next = new Set(planIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    plansMutation.mutate([...next]);
  };

  const columns: ColumnDef<EndpointGroupListItem>[] = [
    { id: "name", header: "Пакет", cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.code} · {row.original.routeClass}
        </p>
      </div>
    ) },
    { id: "status", header: "Статус", cell: ({ row }) => <Badge>{row.original.status}</Badge> },
    { accessorKey: "memberCount", header: "Серверов" },
    { accessorKey: "planCount", header: "Тарифов" },
  ];

  return (
    <div id="packages" className="scroll-mt-(--header-height) flex flex-col gap-4">
      <SectionHeader
        title="Серверные пакеты"
        description="«Серверный пакет» — это набор серверов, которые вместе выдаются клиенту в рамках одного тарифа этого бренда. Например, пакет «Европа Стандарт» может включать сервера в Нидерландах, Франции и Германии. Один сервер может входить сразу в несколько пакетов."
        actions={
          mayWrite && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger render={<Button size="sm">Создать пакет</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать серверный пакет</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Код пакета</Label>
                    <Input placeholder="Код (A-Z0-9_)" value={newGroup.code} onChange={(event) => setNewGroup((value) => ({ ...value, code: event.target.value.toUpperCase() }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Название пакета</Label>
                    <Input placeholder="Название" value={newGroup.name} onChange={(event) => setNewGroup((value) => ({ ...value, name: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Класс маршрутизации</Label>
                    <Input placeholder="Класс маршрутизации (опционально)" value={newGroup.routeClass} onChange={(event) => setNewGroup((value) => ({ ...value, routeClass: event.target.value.toUpperCase() }))} />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="outline" />}>Отмена</DialogClose>
                  <Button disabled={!newGroup.code || !newGroup.name || createMutation.isPending} onClick={() => createMutation.mutate()}>
                    {createMutation.isPending && <Spinner />}
                    Создать
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />
      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={groups.data?.items ?? []}
            isLoading={groups.isLoading}
            isError={groups.isError}
            errorMessage="Не удалось получить пакеты."
            emptyMessage="Пакеты не найдены."
            onRowClick={(group) => setSelectedId(group.id)}
            isRowActive={(group) => group.id === selectedId}
          />
        </CardContent>
      </Card>

      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(undefined)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail.isLoading ? (
            <div className="space-y-3 pt-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : detail.isError ? (
            <p className="pt-6 text-sm text-destructive">Не удалось получить карточку пакета.</p>
          ) : detail.data ? (
            <>
              <SheetHeader>
                <SheetTitle>{detail.data.name}</SheetTitle>
                <SheetDescription>
                  {detail.data.code} · {detail.data.routeClass}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-6">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Серверы в пакете — клик по названию открывает редактирование</p>
                  <ScrollArea className="h-64 rounded-md border p-3">
                    <div className="space-y-2">
                      {endpoints.data?.items.map((endpoint) => (
                        <div key={endpoint.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`member-${endpoint.id}`}
                            checked={memberIds.has(endpoint.id)}
                            disabled={membersMutation.isPending || !mayWrite}
                            onCheckedChange={() => toggleMember(endpoint.id)}
                          />
                          <button type="button" className="flex-1 truncate text-left text-sm hover:underline" onClick={() => setSelectedEndpointId(endpoint.id)}>
                            <EndpointName name={endpoint.name} /> ({endpoint.countryCode}, {endpoint.protocol})
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">Тарифы этого бренда, получающие доступ через этот пакет</p>
                  <ScrollArea className="h-64 rounded-md border p-3">
                    <div className="space-y-2">
                      {plans.data?.items.map((plan) => (
                        <Label key={plan.id} className="flex items-center gap-2 font-normal">
                          <Checkbox checked={planIds.has(plan.id)} disabled={plansMutation.isPending || !mayWrite} onCheckedChange={() => togglePlan(plan.id)} />
                          {plan.name}
                        </Label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <EndpointEditDialog
        endpoint={endpoints.data?.items.find((endpoint) => endpoint.id === selectedEndpointId)}
        onOpenChange={(open) => !open && setSelectedEndpointId(undefined)}
        mayWrite={mayEditEndpoints}
      />
    </div>
  );
}
