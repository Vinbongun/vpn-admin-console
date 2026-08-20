import { describe, expect, it } from "vitest";
import type { AuthPrincipal } from "@/api/types";
import { can } from "@/lib/access-control";

const staff: AuthPrincipal = {
  audience: "staff",
  identityId: "10cecbde-743e-4c91-8761-d83fbca58509",
  sessionId: "dc647f1a-6b1b-4bd3-81ed-c95918246814",
  email: "staff@example.com",
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
