"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export function useBrandFilter() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selected = useMemo(() => {
    const raw = searchParams.get("brands");
    return raw ? raw.split(",").filter(Boolean) : [];
  }, [searchParams]);

  const setSelected = useCallback(
    (codes: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (codes.length > 0) params.set("brands", codes.join(","));
      else params.delete("brands");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const brandCodes = selected.length > 0 ? selected.join(",") : undefined;

  return { selected, setSelected, brandCodes };
}
