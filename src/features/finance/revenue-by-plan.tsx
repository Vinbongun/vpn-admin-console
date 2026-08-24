import type { FinanceSummary } from "@/api/types";

export function RevenueByPlan({ items }: { items: FinanceSummary["revenueByPlan"] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Нет данных за период.</p>;

  const max = Math.max(1, ...items.map((item) => item.amount));
  const sorted = [...items].sort((a, b) => b.amount - a.amount);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((item) => (
        <div key={`${item.planId}-${item.currency}`} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-medium">{item.planName ?? item.planCode ?? "—"}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {item.amount.toFixed(2)} {item.currency}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(2, (item.amount / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
