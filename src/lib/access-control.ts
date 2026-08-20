export function can(principal: { permissions: string[] } | undefined, permission: string) {
  return principal?.permissions.includes(permission) ?? false;
}
