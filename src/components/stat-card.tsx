import type { LucideIcon } from "lucide-react";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  footer,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card", className)}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[180px]/card:text-3xl">{value}</CardTitle>
        {Icon && (
          <CardAction>
            <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </div>
          </CardAction>
        )}
      </CardHeader>
      {footer && <CardFooter className="text-sm text-muted-foreground">{footer}</CardFooter>}
    </Card>
  );
}
