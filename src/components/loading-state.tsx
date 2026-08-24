import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function LoadingState({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-32 w-full items-center justify-center text-muted-foreground", className)}>
      <Spinner className="size-5" />
    </div>
  );
}
