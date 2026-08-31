// Uses the browser's built-in Intl.DisplayNames instead of a hand-maintained code->name table -
// covers every ISO 3166-1 alpha-2 code correctly in Russian without us tracking one ourselves.
const regionNames = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["ru"], { type: "region" }) : undefined;

export function countryNameRu(code: string | null | undefined): string | undefined {
  if (!code || code.length !== 2) return undefined;
  try {
    return regionNames?.of(code.toUpperCase());
  } catch {
    return undefined;
  }
}
