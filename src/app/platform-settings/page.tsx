"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { PlatformSettingsList } from "@/features/platform-settings/platform-settings-list";
import { can } from "@/lib/access-control";

export default function PlatformSettingsPage() {
  const staff = useQuery({ queryKey: ["staff-session"], queryFn: adminApi.getSession, retry: false });
  const mayWrite = can(staff.data, "platform_settings.write");

  return (
    <AppShell>
      <PageHeader
        title="Настройки платформы"
        description="Общие для всей платформы значения — лимиты входа, срок жизни кода подтверждения и сессий, окно активности устройств"
      />
      <PlatformSettingsList mayWrite={mayWrite} />
    </AppShell>
  );
}
