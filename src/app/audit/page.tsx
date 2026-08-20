"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const events = useQuery({ queryKey: ["admin-audit", page, action, resourceType], queryFn: () => adminApi.listAuditEvents({ page, pageSize: 25, ...(action ? { action } : {}), ...(resourceType ? { resourceType } : {}) }), retry: false });
  const totalPages = Math.max(1, Math.ceil((events.data?.total ?? 0) / (events.data?.pageSize ?? 25)));

  return <AppShell><PageHeader title="Audit" description="Метаданные административных событий без sensitive payload" /><Card className="mb-4"><CardContent className="grid gap-3 pt-6 md:grid-cols-2"><Input aria-label="Фильтр по действию" placeholder="Action" value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} /><Input aria-label="Фильтр по ресурсу" placeholder="Resource type" value={resourceType} onChange={(event) => { setResourceType(event.target.value); setPage(1); }} /></CardContent></Card><Card><CardHeader><CardTitle>События</CardTitle><CardDescription>`GET /admin/v1/audit-events`</CardDescription></CardHeader><CardContent className="overflow-x-auto">{events.isLoading ? <p>Загрузка…</p> : events.isError ? <p className="text-red-600">Не удалось получить audit events.</p> : <><table className="w-full min-w-3xl text-sm"><thead><tr className="border-b text-left"><th className="p-3">Время</th><th className="p-3">Действие</th><th className="p-3">Actor</th><th className="p-3">Ресурс</th><th className="p-3">Причина</th></tr></thead><tbody>{events.data?.items.map((event) => <tr className="border-b last:border-0" key={event.id}><td className="p-3">{new Date(event.occurredAt).toLocaleString("ru-RU")}</td><td className="p-3 font-medium">{event.action}</td><td className="p-3">{event.actorType}{event.actorId ? ` · ${event.actorId}` : ""}</td><td className="p-3">{event.resourceType}{event.resourceId ? ` · ${event.resourceId}` : ""}</td><td className="p-3">{event.reason ?? "—"}</td></tr>)}</tbody></table><div className="mt-4 flex items-center justify-between"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Назад</Button><span className="text-sm text-muted-foreground">{page} / {totalPages}</span><Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Далее</Button></div></>}</CardContent></Card></AppShell>;
}
