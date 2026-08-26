"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronsUpDownIcon, ExternalLinkIcon, GaugeIcon, LogOutIcon, ShieldCheckIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_URL, adminApi } from "@/api/client";
import { sessionTokens } from "@/api/session";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { can } from "@/lib/access-control";
import { navigation } from "@/lib/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const hasSession = Boolean(sessionTokens.getStaff());
  const { data: staff, isError } = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, enabled: hasSession, retry: false });

  useEffect(() => {
    if (!hasSession || isError) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hasSession, isError, pathname, router]);

  const items = navigation.filter((item) => !item.permission || can(staff, item.permission));
  const current = navigation.find((item) => item.href === pathname);

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await adminApi.logout();
    } finally {
      sessionTokens.clearStaff();
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton size="lg">
                      <div className="flex aspect-square size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <ShieldCheckIcon className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">VPN Platform</span>
                        <span className="truncate text-xs text-muted-foreground">Admin Console</span>
                      </div>
                      <ChevronsUpDownIcon className="ml-auto size-4" />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent side="right" align="start" className="w-64">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">VPN Platform</p>
                        <p className="text-xs text-muted-foreground">Admin Console</p>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/" />}>
                    <GaugeIcon />
                    Обзор
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<a href={`${API_URL}/docs`} target="_blank" rel="noreferrer" />}>
                    <ExternalLinkIcon />
                    API документация
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(({ href, label, icon: Icon, items: subItems }) => {
                  const isCurrent = pathname === href || (subItems?.some((subItem) => subItem.href.split("#")[0] === pathname) ?? false);
                  if (!subItems) {
                    return (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton render={<Link href={href} />} isActive={isCurrent} tooltip={label}>
                          <Icon />
                          <span>{label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  return (
                    <Collapsible key={href} defaultOpen={isCurrent} className="group/collapsible">
                      <SidebarMenuItem>
                        <SidebarMenuButton render={<CollapsibleTrigger />} isActive={isCurrent} tooltip={label}>
                          <Icon />
                          <span>{label}</span>
                          <ChevronDownIcon className="ml-auto transition-transform group-data-open/collapsible:rotate-180" />
                        </SidebarMenuButton>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {subItems.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.href}>
                                <SidebarMenuSubButton isActive={pathname === subItem.href.split("#")[0]} render={<Link href={subItem.href} />}>
                                  {subItem.label}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton size="lg">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-xs">
                          <UserRoundIcon className="size-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{staff?.displayName ?? "Загрузка…"}</span>
                        <span className="truncate text-xs text-muted-foreground">{staff?.email}</span>
                      </div>
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent side="right" align="end" className="w-64">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">{staff?.displayName}</p>
                        <p className="text-xs text-muted-foreground">{staff?.email}</p>
                        {staff?.roles[0] && <Badge className="mt-1 w-fit">{staff.roles[0]}</Badge>}
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={isLoggingOut} onClick={logout}>
                    {isLoggingOut ? <Spinner /> : <LogOutIcon />}
                    {isLoggingOut ? "Выходим…" : "Выйти"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-(--header-height) shrink-0 items-center justify-between gap-2 border-b">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{current?.label ?? "VPN Platform"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
