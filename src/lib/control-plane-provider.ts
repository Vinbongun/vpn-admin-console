// A "panel" (REMNAWAVE/3X_UI) has a real API - credentials, sync, nodes. Everything else stored
// as a control_plane_source (WIREGUARD, HYSTERIA2, and any future protocol added via the
// not-yet-built deploy-protocol role) is a standalone protocol on one dedicated VPS: no API, no
// credentials, no sync, no nodes - just a location and which single VPS it lives on. Same table,
// same admin API, deliberately different (trimmed) UI treatment - see source-edit-dialog.tsx and
// panels-and-servers-page.tsx.
export function isPanelProviderType(providerType: string): boolean {
  return providerType === "3X_UI" || providerType === "REMNAWAVE";
}

export function providerLabel(providerType: string): string {
  if (providerType === "3X_UI") return "3x-ui";
  if (providerType === "REMNAWAVE") return "Remnawave";
  if (providerType === "WIREGUARD") return "WireGuard";
  if (providerType === "HYSTERIA2") return "Hysteria2";
  if (providerType === "AMNEZIAWG") return "AmneziaWG";
  return providerType;
}
