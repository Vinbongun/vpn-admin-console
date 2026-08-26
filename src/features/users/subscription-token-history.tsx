"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import type { SubscriptionTokenSummary } from "@/api/types";
import { CopyButton } from "@/components/copy-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("ru-RU") : null;
}

function TokenRow({ token, compact }: { token: SubscriptionTokenSummary; compact?: boolean }) {
  const dates = [
    `выдан ${formatDate(token.createdAt)}`,
    token.lastUsedAt && `использован ${formatDate(token.lastUsedAt)}`,
    token.revokedAt && `отозван ${formatDate(token.revokedAt)}`,
    token.expiresAt && `истекает ${formatDate(token.expiresAt)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-md border p-2 text-xs">
      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono">{token.tokenPrefix}</span>
          <StatusBadge status={token.status} />
        </div>
      )}
      {token.status === "ACTIVE" && token.subscriptionUrl ? (
        <div className="mt-1.5 flex items-center gap-1.5">
          <code className="flex-1 truncate rounded bg-muted px-1.5 py-1">{token.subscriptionUrl}</code>
          <CopyButton value={token.subscriptionUrl} />
        </div>
      ) : (
        <p className="mt-1.5 text-muted-foreground">Старая ссылка недоступна для восстановления — хранится только её отпечаток, как у пароля.</p>
      )}
      <p className="mt-1 text-muted-foreground">{dates}</p>
    </div>
  );
}

export function SubscriptionTokenHistory({ tokens, compact }: { tokens: SubscriptionTokenSummary[]; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  if (tokens.length === 0) return <p className="text-xs text-muted-foreground">Ссылок пока не выдано.</p>;

  const activeToken = tokens.find((token) => token.status === "ACTIVE");
  const restTokens = tokens.filter((token) => token !== activeToken);

  return (
    <div className="space-y-2">
      {activeToken && <TokenRow token={activeToken} compact={compact} />}
      {restTokens.length > 0 && (
        <>
          <Button type="button" size="sm" variant="ghost" className="h-auto p-0 text-xs text-muted-foreground" onClick={() => setOpen((value) => !value)}>
            <ChevronDownIcon className={open ? "rotate-180" : ""} />
            Показать историю ссылок ({tokens.length})
          </Button>
          {open && (
            <div className="space-y-2">
              {restTokens.map((token) => (
                <TokenRow key={token.id} token={token} compact={compact} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
