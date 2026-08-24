const REGIONAL_INDICATOR_A = 0x1f1e6;
const REGIONAL_INDICATOR_Z = 0x1f1ff;

function isRegionalIndicator(char: string): boolean {
  const point = char.codePointAt(0) ?? 0;
  return point >= REGIONAL_INDICATOR_A && point <= REGIONAL_INDICATOR_Z;
}

/**
 * Endpoint names carry a leading country hint set by whoever configured the panel — either
 * plain ASCII (e.g. "FR Париж Vless") or an actual flag emoji baked into the string (e.g.
 * "🇫🇷Париж Vless", with or without a following space). Flag emoji are unreliable across
 * OSes/fonts (Windows in particular often falls back to showing the two bare letters), so
 * this pulls the hint out either way and lets the caller render a real flag icon instead.
 */
export function parseLeadingCountryCode(name: string): { code: string | null; label: string } {
  const asciiMatch = /^([A-Za-z]{2})\s+(.+)$/.exec(name);
  if (asciiMatch) return { code: asciiMatch[1].toUpperCase(), label: asciiMatch[2] };

  const chars = [...name];
  if (chars.length >= 2 && isRegionalIndicator(chars[0]) && isRegionalIndicator(chars[1])) {
    const letter = (char: string) => String.fromCharCode(65 + (char.codePointAt(0)! - REGIONAL_INDICATOR_A));
    const code = letter(chars[0]) + letter(chars[1]);
    const label = chars.slice(2).join("").replace(/^\s+/, "");
    return { code, label };
  }

  return { code: null, label: name };
}
