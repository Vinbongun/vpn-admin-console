"use client";

import type { LucideIcon } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A selectable tile (icon + title + description) used wherever staff picks between a few
 *  install/setup options - forwards ref/props so it can be dropped in as a Dialog/DropdownMenu
 *  trigger's `render` element exactly like <Button/> is used elsewhere. */
export const OptionTile = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon }>(
  ({ icon: Icon, className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex flex-1 flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:border-foreground/30 hover:bg-accent disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <Icon className="size-5 text-muted-foreground" />
      <div className="space-y-0.5">{children}</div>
    </button>
  ),
);
OptionTile.displayName = "OptionTile";

export function OptionTileTitle({ children }: { children: ReactNode }) {
  return <p className="text-sm font-medium">{children}</p>;
}

export function OptionTileDescription({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
