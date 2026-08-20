"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { can, mockCurrentStaff } from "@/lib/access-control";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const items = navigation.filter((item) => !item.permission || can(mockCurrentStaff, item.permission));

  return <div className="min-h-screen bg-muted/40">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5"><div className="rounded-lg bg-primary p-2 text-primary-foreground"><ShieldCheck className="size-5" /></div><div><p className="font-semibold">VPN Platform</p><p className="text-xs text-muted-foreground">Admin Console</p></div></div>
      <nav className="flex-1 space-y-1 p-3">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", pathname === href && "bg-accent font-medium text-foreground")}><Icon className="size-4" />{label}</Link>)}</nav>
      <div className="border-t p-4"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">АВ</div><div className="min-w-0"><p className="truncate text-sm font-medium">{mockCurrentStaff.name}</p><Badge className="mt-1">{mockCurrentStaff.role}</Badge></div></div></div>
    </aside>
    <div className="md:pl-64"><header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-8"><div><p className="text-sm font-medium">Единая платформа</p><p className="text-xs text-muted-foreground">Все бренды · mock data</p></div><ThemeToggle /></header><main className="p-4 md:p-8">{children}</main></div>
  </div>;
}
