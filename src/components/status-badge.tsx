import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NEGATIVE = new Set(["SUSPENDED", "REVOKED", "EXPIRED", "FAILED", "CANCELLED", "CRITICAL", "UNHEALTHY", "ERROR", "UNREACHABLE"]);
const NEUTRAL = new Set(["PENDING", "TRIAL", "PAST_DUE", "WARNING", "DEGRADED", "ACKNOWLEDGED", "OPEN", "ARCHIVED", "DECOMMISSIONED"]);

// Every distinct status/level enum value used anywhere in the app behind StatusBadge (collected
// from every "... IN (...)" check constraint across the backend migrations) - one shared
// translation table so a status reads the same Russian word everywhere it appears, instead of
// each page inventing its own label. An unmapped value (a future enum addition) falls back to
// showing the raw English value rather than breaking - never silently hides a real status.
const RUSSIAN_LABELS: Record<string, string> = {
  ACTIVE: "Активен",
  INACTIVE: "Неактивен",
  PENDING: "Ожидание",
  PROCESSING: "Выполняется",
  TRIAL: "Пробный период",
  PAST_DUE: "Просрочен",
  EXPIRED: "Истёк",
  SUSPENDED: "Приостановлен",
  REVOKED: "Отозван",
  PROVISIONING: "Разворачивается",
  HEALTHY: "Исправен",
  DEGRADED: "Деградирован",
  UNHEALTHY: "Неисправен",
  UNREACHABLE: "Недоступен",
  DRAINING: "Выводится из эксплуатации",
  DISABLED: "Отключён",
  RETIRED: "Списан",
  DECOMMISSIONED: "Списан",
  ARCHIVED: "Архивирован",
  OPEN: "Открыт",
  ACKNOWLEDGED: "Подтверждён",
  RESOLVED: "Решён",
  CONFIRMED: "Подтверждён",
  CANCELLED: "Отменён",
  SUCCEEDED: "Успешно",
  SUCCESS: "Успешно",
  FAILED: "Ошибка",
  PAID: "Оплачен",
  REFUNDED: "Возвращён",
  INFO: "Инфо",
  WARNING: "Предупреждение",
  WARN: "Предупреждение",
  ERROR: "Ошибка",
  DEBUG: "Отладка",
  CRITICAL: "Критично",
};

function variantFor(status: string): "default" | "destructive" | "outline" {
  const normalized = status.toUpperCase();
  if (NEGATIVE.has(normalized)) return "destructive";
  if (NEUTRAL.has(normalized)) return "outline";
  return "default";
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={variantFor(status)} className={cn("font-normal", className)}>
      {RUSSIAN_LABELS[status.toUpperCase()] ?? status}
    </Badge>
  );
}
