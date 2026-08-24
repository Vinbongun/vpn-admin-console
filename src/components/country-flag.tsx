import * as Flags from "country-flag-icons/react/3x2";
import { cn } from "@/lib/utils";

export function CountryFlag({ code, className }: { code: string | null | undefined; className?: string }) {
  if (!code || code.length !== 2) return null;
  const Flag = Flags[code.toUpperCase() as keyof typeof Flags];
  if (!Flag) return null;
  return <Flag className={cn("inline-block h-3.5 w-5 shrink-0 rounded-[2px] align-[-0.1em]", className)} />;
}
