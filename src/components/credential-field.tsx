"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

/** Read-only field styled as a static "input" (label above, bordered box with a leading icon,
 *  value inside) with its own copy button to the right of the box - matches the platform's
 *  general boxed-input look rather than a plain text row. Masked by default for a password,
 *  shown plainly for a login/URL. Used for credentials read straight out of an install job's own
 *  report (the only place they exist - never re-fetched, never stored anywhere else via a
 *  decrypt endpoint). */
export function CredentialField({ label, value, icon: Icon, maskable, href }: { label: string; value: string; icon: LucideIcon; maskable?: boolean; href?: string }) {
  const [revealed, setRevealed] = useState(!maskable);
  const displayValue = maskable && !revealed ? "•".repeat(Math.min(value.length, 16)) : value;

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          {href ? (
            <Link href={href} target="_blank" rel="noreferrer" className="truncate font-mono text-sm text-muted-foreground hover:text-foreground hover:underline">
              {displayValue}
            </Link>
          ) : (
            <span className="truncate font-mono text-sm text-muted-foreground">{displayValue}</span>
          )}
        </div>
        {maskable && (
          <Button type="button" size="icon-sm" variant="outline" className="shrink-0" onClick={() => setRevealed((prev) => !prev)}>
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
        )}
        <CopyButton value={value} />
      </div>
    </div>
  );
}
