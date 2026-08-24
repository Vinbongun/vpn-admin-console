"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCwIcon, UserRoundXIcon, UsersRoundIcon } from "lucide-react";
import { useState } from "react";
import { adminApi } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { can } from "@/lib/access-control";

const DEFAULT_GRACE_DAYS = 3;

export function RetentionSection({ staff, brandCodes }: { staff: { permissions: string[] } | undefined; brandCodes?: string }) {
  const [graceDaysInput, setGraceDaysInput] = useState(String(DEFAULT_GRACE_DAYS));
  const [appliedGraceDays, setAppliedGraceDays] = useState(DEFAULT_GRACE_DAYS);

  const mayView = can(staff, "subscriptions.read");
  const retention = useQuery({
    queryKey: ["admin-retention-summary", appliedGraceDays, brandCodes],
    queryFn: () => adminApi.getRetentionSummary({ graceDays: appliedGraceDays, brandCodes }),
    enabled: mayView,
    retry: false,
  });

  if (!mayView) return null;

  const apply = () => {
    const parsed = Number(graceDaysInput);
    if (Number.isFinite(parsed) && parsed >= 0) setAppliedGraceDays(parsed);
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        title="Ретеншен"
        description="Клиенты, которые оплатили, но не пользуются платформой, и клиенты без продления после истечения подписки"
        actions={
          <Field orientation="horizontal" className="gap-2">
            <FieldLabel htmlFor="grace-days" className="text-xs whitespace-nowrap">
              Грейс-период, дней
            </FieldLabel>
            <Input
              id="grace-days"
              type="number"
              min={0}
              className="h-8 w-20"
              value={graceDaysInput}
              onChange={(event) => setGraceDaysInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && apply()}
            />
            <Button size="sm" variant="outline" onClick={apply} disabled={retention.isFetching}>
              {retention.isFetching ? <Spinner /> : <RefreshCwIcon />}
              Обновить
            </Button>
          </Field>
        }
      />
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        <StatCard
          label="Купили, но не пользуются"
          icon={UsersRoundIcon}
          value={retention.isLoading ? "…" : retention.isError ? "—" : (retention.data?.purchasedInactive ?? 0)}
          footer={`Активные подписки без активности за пределами грейс-периода в ${retention.data?.graceDays ?? appliedGraceDays} дн.`}
        />
        <StatCard
          label="Подписка закончилась без продления"
          icon={UserRoundXIcon}
          value={retention.isLoading ? "…" : retention.isError ? "—" : (retention.data?.expiredNoRenewal ?? 0)}
          footer="По последней подписке клиента"
        />
      </div>
    </div>
  );
}
