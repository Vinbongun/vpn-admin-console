"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const subscribe = () => () => undefined;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = resolvedTheme === "dark";
  return (
    <Button
      aria-label="Переключить тему"
      disabled={!mounted}
      variant="ghost"
      size="icon"
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {mounted ? (dark ? <Sun /> : <Moon />) : <span className="size-6" aria-hidden="true" />}
    </Button>
  );
}
