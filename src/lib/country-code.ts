/**
 * Endpoint names carry a leading ISO alpha-2 hint (e.g. "FR Париж Vless") set by whoever
 * configured the panel. Pulls that prefix out so the caller can render a real flag icon
 * instead of the raw text.
 */
export function parseLeadingCountryCode(name: string): { code: string | null; label: string } {
  const match = /^([A-Za-z]{2})\s+(.+)$/.exec(name);
  return match ? { code: match[1].toUpperCase(), label: match[2] } : { code: null, label: name };
}
