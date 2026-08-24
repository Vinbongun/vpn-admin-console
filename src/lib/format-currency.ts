import type { CurrencyAmount } from "@/api/types";

export function formatCurrencyAmounts(amounts: CurrencyAmount[] | undefined): string {
  if (!amounts || amounts.length === 0) return "—";
  return amounts.map((row) => `${row.amount.toFixed(2)} ${row.currency}`).join(", ");
}
