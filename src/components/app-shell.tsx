"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { adminApi } from "@/api/client";
import { sessionTokens } from "@/api/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { can } from "@/lib/access-control";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hasSession = Boolean(sessionTokens.getStaff());
  const { data: staff, isError } = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, enabled: hasSession, retry: false });

  useEffect(() => { if (!hasSession || isError) router.replace("/login"); }, [hasSession, isError, router]);

  const items = navigation.filter((item) => !item.permission || can(staff, item.permission));
  const initials = staff?.displayName.slice(0, 2).toUpperCase() ?? "--";

  return <div className="min-h-screen bg-muted/40">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5"><div className="rounded-lg bg-primary p-2 text-primary-foreground"><ShieldCheck className="size-5" /></div><div><p className="font-semibold">VPN Platform</p><p className="text-xs text-muted-foreground">Admin Console</p></div></div>
      <nav className="flex-1 space-y-1 p-3">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", pathname === href && "bg-accent font-medium text-foreground")}><Icon className="size-4" />{label}</Link>)}</nav>
      <div className="border-t p-4"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{initials}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{staff?.displayName ?? "Загрузка…"}</p><p className="truncate text-xs text-muted-foreground">{staff?.email}</p><Badge className="mt-1">{staff?.roles[0] ?? "STAFF"}</Badge></div></div></div>
    </aside>
    <div className="md:pl-64"><header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-8"><div><p className="text-sm font-medium">Единая платформа</p><p className="text-xs text-muted-foreground">Данные vpn-platform-backend</p></div><ThemeToggle /></header><main className="p-4 md:p-8">{children}</main></div>
  </div>;
}
