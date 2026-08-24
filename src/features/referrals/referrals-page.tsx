"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Separator } from "@/components/ui/separator";
import { ProgramsSection } from "@/features/referrals/programs-section";
import { ReferralsList } from "@/features/referrals/referrals-list";
import { can } from "@/lib/access-control";

export function ReferralsPage() {
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "finance.write");

  return (
    <AppShell>
      <PageHeader title="Рефералы" description="Реферальные программы по брендам и начисления вознаграждений" />
      <ProgramsSection mayWrite={mayWrite} />
      <Separator />
      <ReferralsList />
    </AppShell>
  );
}
