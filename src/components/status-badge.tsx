import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NEGATIVE = new Set(["SUSPENDED", "REVOKED", "EXPIRED", "FAILED", "CANCELLED", "CRITICAL", "UNHEALTHY", "ERROR"]);
const NEUTRAL = new Set(["PENDING", "TRIAL", "PAST_DUE", "WARNING", "DEGRADED", "ACKNOWLEDGED", "OPEN", "ARCHIVED"]);

function variantFor(status: string): "default" | "destructive" | "outline" {
  const normalized = status.toUpperCase();
  if (NEGATIVE.has(normalized)) return "destructive";
  if (NEUTRAL.has(normalized)) return "outline";
  return "default";
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={variantFor(status)} className={cn("font-normal", className)}>
      {status}
    </Badge>
  );
}
