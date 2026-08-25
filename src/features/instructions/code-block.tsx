"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { isValidElement, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return extractText(node.props.children);
  return "";
}

export function CodeBlock({ children, ...props }: React.ComponentProps<"pre">) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(extractText(children));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, insecure context) - nothing useful to do beyond leaving the button as-is.
    }
  };

  return (
    <div className="group relative">
      <pre {...props}>{children}</pre>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={copy}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
  );
}
