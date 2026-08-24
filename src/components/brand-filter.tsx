"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2Icon, ChevronDownIcon } from "lucide-react";
import { adminApi } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export function BrandFilter({ selected, onChange }: { selected: string[]; onChange: (codes: string[]) => void }) {
  const brands = useQuery({ queryKey: ["admin-brands"], queryFn: adminApi.listBrands, retry: false });
  const allSelected = selected.length === 0;

  const label = allSelected
    ? "Все бренды"
    : selected.length === 1
      ? (brands.data?.find((brand) => brand.code === selected[0])?.name ?? selected[0])
      : `Бренды: ${selected.length}`;

  const toggle = (code: string) => {
    onChange(selected.includes(code) ? selected.filter((value) => value !== code) : [...selected, code]);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            <Building2Icon />
            {label}
            <ChevronDownIcon className="text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-64 gap-1 p-2">
        <button
          type="button"
          onClick={() => onChange([])}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
        >
          <Checkbox checked={allSelected} />
          Все бренды
        </button>
        <Separator className="my-1" />
        <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {brands.isLoading && <p className="px-2 py-1.5 text-sm text-muted-foreground">Загрузка…</p>}
          {brands.data?.map((brand) => (
            <label key={brand.id} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
              <Checkbox checked={selected.includes(brand.code)} onCheckedChange={() => toggle(brand.code)} />
              <span className="flex-1 truncate">{brand.name}</span>
              <span className="text-xs text-muted-foreground">{brand.code}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
