"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { CountryFlag } from "@/components/country-flag";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface CountryOption {
  code: string;
  name: string;
}

/** Searchable country dropdown - a plain <Select> is unwieldy for a ~49-entry list. The backend
 *  is the only source of truth for both the names and their order (see reference/countries.ts) -
 *  this component filters that already-sorted list by substring match, it never reorders it. */
export function CountrySearchSelect({
  id,
  options,
  value,
  onChange,
  loading,
  placeholder = "Выберите страну",
}: {
  id?: string;
  options: CountryOption[];
  value: string;
  onChange: (code: string) => void;
  loading?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.code === value);
  const filtered = query.trim() ? options.filter((option) => option.name.toLowerCase().includes(query.trim().toLowerCase())) : options;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        render={
          <button
            id={id}
            type="button"
            className="flex h-9 w-full items-center gap-1.5 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        }
      >
        {selected ? (
          <span className="flex items-center gap-1.5">
            <CountryFlag code={selected.code} />
            {selected.name}
          </span>
        ) : (
          <span className="text-muted-foreground">{loading ? "Загрузка…" : placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) p-0">
        <div className="p-2">
          <Input autoFocus placeholder="Поиск страны…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Ничего не найдено.</p>
          ) : (
            filtered.map((option) => (
              <button
                key={option.code}
                type="button"
                className={cn("flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent", option.code === value && "bg-accent")}
                onClick={() => {
                  onChange(option.code);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <CountryFlag code={option.code} />
                <span className="flex-1">{option.name}</span>
                {option.code === value && <CheckIcon className="size-4" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
