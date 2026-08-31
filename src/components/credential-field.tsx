"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";

/** Read-only field with the value masked by default (for a password) or shown plainly (for a
 *  login/URL), always with its own copy button. Used for credentials read straight out of an
 *  install job's own report (the only place they exist - never re-fetched, never stored anywhere
 *  else via a decrypt endpoint). */
export function CredentialField({ label, value, maskable, href }: { label: string; value: string; maskable?: boolean; href?: string }) {
  const [revealed, setRevealed] = useState(!maskable);
  const displayValue = maskable && !revealed ? "•".repeat(Math.min(value.length, 16)) : value;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {href ? (
          <Link href={href} target="_blank" rel="noreferrer" className="truncate font-mono text-sm underline">
            {displayValue}
          </Link>
        ) : (
          <span className="truncate font-mono text-sm">{displayValue}</span>
        )}
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
