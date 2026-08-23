"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const subscribe = () => () => undefined;

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={!mounted}
        render={
          <Button aria-label="Переключить тему" variant="ghost" size="icon-sm">
            <SunIcon className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <MoonIcon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Светлая</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Тёмная</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>Как в системе</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
