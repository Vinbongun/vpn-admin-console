"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/client";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { PlatformSettingCard } from "@/features/platform-settings/platform-setting-card";
import { settingsMeta } from "@/features/platform-settings/settings-metadata";

export function PlatformSettingsList({ mayWrite }: { mayWrite: boolean }) {
  const settings = useQuery({ queryKey: ["platform-settings"], queryFn: adminApi.listPlatformSettings, retry: false });

  if (settings.isLoading) return <LoadingState />;
  if (settings.isError) return <ErrorState description="Не удалось получить настройки платформы." />;

  const byKey = new Map(settings.data?.map((setting) => [setting.key, setting]));

  return (
    <div className="flex flex-col gap-4">
      {settingsMeta.map((meta) => {
        const setting = byKey.get(meta.key);
        return setting ? <PlatformSettingCard key={meta.key} meta={meta} setting={setting} mayWrite={mayWrite} /> : null;
      })}
    </div>
  );
}
