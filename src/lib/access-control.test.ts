import { describe, expect, it } from "vitest";
import type { StaffProfile } from "@/api/types";
import { can } from "@/lib/access-control";

const staff: StaffProfile = {
  id: "10cecbde-743e-4c91-8761-d83fbca58509",
  email: "staff@example.com",
  displayName: "Staff User",
  roles: ["MANAGER"],
  permissions: ["subscriptions.read"],
};

describe("access control", () => {
  it("uses permissions returned by the backend", () => {
    expect(can(staff, "subscriptions.read")).toBe(true);
    expect(can(staff, "subscriptions.write")).toBe(false);
  });

  it("denies access while the principal is unavailable", () => {
    expect(can(undefined, "subscriptions.read")).toBe(false);
  });
});
