export function flagEmoji(countryCode: string | null | undefined): string | null {
  if (!countryCode || countryCode.length !== 2) return null;
  return String.fromCodePoint(...[...countryCode.toUpperCase()].map((char) => 127397 + char.charCodeAt(0)));
}

/**
 * Endpoint names carry a leading ISO alpha-2 hint (e.g. "FR Париж Vless") set by whoever
 * configured the panel. Swaps that text prefix for the actual flag emoji.
 */
export function splitLeadingCountryFlag(name: string): { flag: string | null; label: string } {
  const match = /^([A-Za-z]{2})\s+(.+)$/.exec(name);
  if (!match) return { flag: null, label: name };
  const flag = flagEmoji(match[1]);
  return flag ? { flag, label: match[2] } : { flag: null, label: name };
}
