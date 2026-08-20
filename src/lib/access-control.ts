import type { AuthPrincipal } from "@/api/types";

export function can(principal: AuthPrincipal | undefined, permission: string) {
  return principal?.permissions.includes(permission) ?? false;
}
