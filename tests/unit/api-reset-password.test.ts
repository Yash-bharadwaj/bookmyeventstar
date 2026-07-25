import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/reset-password/route";

const mockState = vi.hoisted(() => ({
  matchByEmail: null as { id: string } | null,
  matchByPhone: null as { id: string } | null,
  updateUserResult: "ok" as "ok" | "throw",
  updatedUserId: null as string | null,
  updatedPassword: null as string | null,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: {
    updateUser: async (uid: string, data: { password: string }) => {
      if (mockState.updateUserResult === "throw") throw new Error("boom");
      mockState.updatedUserId = uid;
      mockState.updatedPassword = data.password;
    },
  },
  adminDb: {
    collection: () => ({
      where: (field: string) => ({
        limit: () => ({
          get: async () => {
            const match = field === "email" ? mockState.matchByEmail : mockState.matchByPhone;
            return {
              empty: !match,
              docs: match ? [{ id: match.id }] : [],
            };
          },
        }),
      }),
    }),
  },
}));

function req(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockState.matchByEmail = null;
  mockState.matchByPhone = null;
  mockState.updateUserResult = "ok";
  mockState.updatedUserId = null;
  mockState.updatedPassword = null;
});

describe("POST /api/auth/reset-password", () => {
  it("rejects a missing identifier", async () => {
    const res = await POST(req({ identifier: "", password: "newpassword123" }));
    expect(res.status).toBe(400);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const res = await POST(req({ identifier: "user@example.com", password: "short1" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when no account matches the email", async () => {
    const res = await POST(req({ identifier: "nobody@example.com", password: "newpassword123" }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when no account matches the phone number", async () => {
    const res = await POST(req({ identifier: "9876543210", password: "newpassword123" }));
    expect(res.status).toBe(404);
  });

  it("resets the password immediately when a matching account is found by email — no ownership verification", async () => {
    mockState.matchByEmail = { id: "user-123" };
    const res = await POST(req({ identifier: "user@example.com", password: "newpassword123" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockState.updatedUserId).toBe("user-123");
    expect(mockState.updatedPassword).toBe("newpassword123");
  });

  it("resets the password immediately when a matching account is found by phone — no ownership verification", async () => {
    mockState.matchByPhone = { id: "user-456" };
    const res = await POST(req({ identifier: "9876543210", password: "newpassword123" }));
    expect(res.status).toBe(200);
    expect(mockState.updatedUserId).toBe("user-456");
  });

  it("returns 500 when the Admin SDK password update fails", async () => {
    mockState.matchByEmail = { id: "user-123" };
    mockState.updateUserResult = "throw";
    const res = await POST(req({ identifier: "user@example.com", password: "newpassword123" }));
    expect(res.status).toBe(500);
  });
});
