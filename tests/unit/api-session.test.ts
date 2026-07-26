import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, DELETE } from "@/app/api/auth/session/route";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";

const mockState = vi.hoisted(() => ({
  verifyResult: "ok" as "ok" | "throw",
  userDocExists: true,
  isActive: true as boolean | undefined,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: {
    verifyIdToken: async (token: string) => {
      if (mockState.verifyResult === "throw") throw new Error("invalid token");
      return { uid: "user-123", token };
    },
  },
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: async () => ({
          exists: mockState.userDocExists,
          data: () => ({ is_active: mockState.isActive }),
        }),
      }),
    }),
  },
}));

function req(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/session", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockState.verifyResult = "ok";
  mockState.userDocExists = true;
  mockState.isActive = true;
});

describe("POST /api/auth/session", () => {
  it("rejects a missing idToken", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid/expired idToken", async () => {
    mockState.verifyResult = "throw";
    const res = await POST(req({ idToken: "bad-token" }));
    expect(res.status).toBe(401);
  });

  it("sets an httpOnly session cookie on a valid idToken", async () => {
    const res = await POST(req({ idToken: "good-token" }));
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie?.value).toBe("good-token");
    expect(cookie?.httpOnly).toBe(true);
  });

  it("allows a user with no user doc yet (defense in depth elsewhere handles that case)", async () => {
    mockState.userDocExists = false;
    const res = await POST(req({ idToken: "good-token" }));
    expect(res.status).toBe(200);
  });

  it("rejects a deactivated account and does not set a cookie", async () => {
    mockState.isActive = false;
    const res = await POST(req({ idToken: "good-token" }));
    expect(res.status).toBe(403);
    const cookie = res.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie).toBeUndefined();
  });

  it("treats a missing is_active field as active (older docs predate the field)", async () => {
    mockState.isActive = undefined;
    const res = await POST(req({ idToken: "good-token" }));
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/auth/session", () => {
  it("clears the session cookie", async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(SESSION_COOKIE_NAME);
    // next/server's cookies.delete() sets an expired/empty cookie rather than omitting it
    expect(cookie?.value ?? "").toBe("");
  });
});
