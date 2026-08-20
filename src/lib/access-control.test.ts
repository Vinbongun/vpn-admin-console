import { describe, expect, it } from "vitest";
import { can, mockCurrentStaff } from "@/lib/access-control";

describe("mock access control", () => {
  it("grants permissions exposed by the mock staff response", () => {
    expect(can(mockCurrentStaff, "audit.read")).toBe(true);
  });

  it("keeps permissions as data instead of deriving them from the role name", () => {
    expect(mockCurrentStaff.permissions).toContain("users.read");
  });
});
