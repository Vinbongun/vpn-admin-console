"use client";

import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { adminApi, ApiError } from "@/api/client";
import { sessionTokens } from "@/api/session";

const authProvider = {
  login: async () => ({ success: false, error: { name: "MFA_REQUIRED", message: "Use the staff login flow" } }),
  logout: async () => {
    try { await adminApi.logout(); } finally { sessionTokens.clearStaff(); }
    return { success: true, redirectTo: "/login" };
  },
  check: async () => {
    if (!sessionTokens.getStaff()) return { authenticated: false, redirectTo: "/login" };
    try { await adminApi.getSession(); return { authenticated: true }; }
    catch (error) {
      // Only a genuine 401 means the session is actually invalid - a network blip or a
      // transient backend error shouldn't wipe out an otherwise-valid staff session.
      if (error instanceof ApiError && error.status === 401) {
        sessionTokens.clearStaff();
        return { authenticated: false, redirectTo: "/login" };
      }
      return { authenticated: true };
    }
  },
  getIdentity: () => adminApi.getSession(),
  onError: async (error: unknown) => error instanceof ApiError && error.status === 401
    ? { logout: true, redirectTo: "/login", error }
    : { error: error as Error },
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <ThemeProvider><QueryClientProvider client={queryClient}><TooltipProvider><Suspense fallback={null}><Refine routerProvider={routerProvider} authProvider={authProvider} resources={[]} options={{ disableRouteChangeHandler: true }}>{children}</Refine></Suspense><Toaster /></TooltipProvider></QueryClientProvider></ThemeProvider>;
}
