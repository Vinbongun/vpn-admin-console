"use client";

import { Refine } from "@refinedev/core";
import routerProvider from "@refinedev/nextjs-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { mockCurrentStaff } from "@/lib/access-control";

const authProvider = {
  login: async () => ({ success: true, redirectTo: "/" }),
  logout: async () => ({ success: true, redirectTo: "/login" }),
  check: async () => ({ authenticated: true }),
  getIdentity: async () => mockCurrentStaff,
  onError: async () => ({ error: undefined }),
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <ThemeProvider><QueryClientProvider client={queryClient}><Suspense fallback={null}><Refine routerProvider={routerProvider} authProvider={authProvider} resources={[]}>{children}</Refine></Suspense></QueryClientProvider></ThemeProvider>;
}
