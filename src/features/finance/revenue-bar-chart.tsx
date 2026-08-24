const CHART_HEIGHT = 128;

export function RevenueBarChart({ points, currency }: { points: { date: string; amount: number }[]; currency: string }) {
  if (points.length === 0) return <p className="text-sm text-muted-foreground">Нет данных за период.</p>;

  const max = Math.max(1, ...points.map((point) => point.amount));
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: CHART_HEIGHT }}>
        {points.map((point) => (
          <div
            key={point.date}
            className="flex-1 rounded-t-sm bg-primary/70 transition-colors hover:bg-primary"
            style={{ height: `${Math.max(2, (point.amount / max) * CHART_HEIGHT)}px` }}
            title={`${new Date(point.date).toLocaleDateString("ru-RU")}: ${point.amount.toFixed(2)} ${currency}`}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {points.map((point, index) => (
          <div key={point.date} className="flex-1 text-center text-[10px] text-muted-foreground">
            {index % labelEvery === 0 ? new Date(point.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}
