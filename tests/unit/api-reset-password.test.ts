import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/reset-password/route";

const mockState = vi.hoisted(() => ({
  verifyResult: "throw" as "throw" | { uid: string },
  updateUserResult: "ok" as "ok" | "throw",
  updatedUserId: null as string | null,
  updatedPassword: null as string | null,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: {
    verifyIdToken: async (_token: string) => {
      if (mockState.verifyResult === "throw") throw new Error("invalid token");
      return mockState.verifyResult;
    },
    updateUser: async (uid: string, data: { password: string }) => {
      if (mockState.updateUserResult === "throw") throw new Error("boom");
      mockState.updatedUserId = uid;
      mockState.updatedPassword = data.password;
    },
  },
}));

function req(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockState.verifyResult = "throw";
  mockState.updateUserResult = "ok";
  mockState.updatedUserId = null;
  mockState.updatedPassword = null;
});

describe("POST /api/auth/reset-password", () => {
  it("rejects a missing idToken", async () => {
    const res = await POST(req({ idToken: "", password: "newpassword123" }));
    expect(res.status).toBe(401);
  });

  it("rejects a password shorter than 8 characters", async () => {
    mockState.verifyResult = { uid: "user-123" };
    const res = await POST(req({ idToken: "sometoken", password: "short1" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when the idToken fails verification (expired/forged)", async () => {
    mockState.verifyResult = "throw";
    const res = await POST(req({ idToken: "bad-token", password: "newpassword123" }));
    expect(res.status).toBe(401);
  });

  it("resets the password for the uid proven by the verified idToken — never a self-reported identifier", async () => {
    mockState.verifyResult = { uid: "user-123" };
    const res = await POST(req({ idToken: "good-token", password: "newpassword123" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockState.updatedUserId).toBe("user-123");
    expect(mockState.updatedPassword).toBe("newpassword123");
  });

  it("returns 500 when the Admin SDK password update fails", async () => {
    mockState.verifyResult = { uid: "user-123" };
    mockState.updateUserResult = "throw";
    const res = await POST(req({ idToken: "good-token", password: "newpassword123" }));
    expect(res.status).toBe(500);
  });
});
