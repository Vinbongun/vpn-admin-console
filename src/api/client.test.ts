import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminApi } from "@/api/client";
import { sessionTokens } from "@/api/session";

describe("OpenAPI 0.5.0 client", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("sends the staff bearer token when listing subscriptions", async () => {
    sessionTokens.setStaff("stf_test");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }));

    await adminApi.listSubscriptions();

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://localhost:3000/admin/v1/subscriptions");
    expect(request.headers.get("Authorization")).toBe("Bearer stf_test");
  });

  it("encodes the subscription id in the token rotation path", async () => {
    sessionTokens.setStaff("stf_test");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ token: "secret", tokenPrefix: "sec" }), { status: 201 }));

    await adminApi.rotateSubscriptionToken("subscription/id");

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe("http://localhost:3000/admin/v1/subscriptions/subscription%2Fid/tokens/rotate");
  });
});
