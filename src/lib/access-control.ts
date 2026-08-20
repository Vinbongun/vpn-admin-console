export const staffRoles = [
  "SUPER_ADMIN",
  "MANAGER",
  "SERVER_ADMIN",
  "ECONOMIST",
  "READ_ONLY",
] as const;

export type StaffRole = (typeof staffRoles)[number];

export const permissions = [
  "users.read",
  "subscriptions.read",
  "infrastructure.read",
  "finance.read",
  "audit.read",
] as const;

export type Permission = (typeof permissions)[number];

export type CurrentStaff = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  permissions: Permission[];
};

export const mockCurrentStaff: CurrentStaff = {
  id: "staff_demo_001",
  name: "Алексей Воронов",
  email: "admin@demo-vpn.local",
  role: "SUPER_ADMIN",
  permissions: [...permissions],
};

export function can(staff: CurrentStaff, permission: Permission) {
  return staff.permissions.includes(permission);
}
