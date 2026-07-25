import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/phone-signup/route";

// Mock lib/firebase/admin.ts directly — simpler and more stable than mocking
// three separate firebase-admin submodules, and it's the exact seam the
// route code depends on.
const mockState = vi.hoisted(() => ({
  authUser: { phoneNumber: "+919876543210" } as { phoneNumber: string } | null,
  userDocExists: false,
  emailTaken: false,
  setDocData: null as Record<string, unknown> | null,
  customClaims: null as Record<string, unknown> | null,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: {
    getUser: async () => {
      if (!mockState.authUser) throw new Error("auth/user-not-found");
      return mockState.authUser;
    },
    setCustomUserClaims: async (_uid: string, claims: Record<string, unknown>) => {
      mockState.customClaims = claims;
    },
  },
  adminDb: {
    collection: (name: string) => ({
      doc: (_id: string) => ({
        get: async () => ({ exists: mockState.userDocExists }),
        set: async (data: Record<string, unknown>) => { mockState.setDocData = data; },
      }),
      where: () => ({
        limit: () => ({
          get: async () => ({ empty: !mockState.emailTaken }),
        }),
      }),
    }),
  },
}));

function req(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/phone-signup", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validBody = {
  uid: "verified-uid-123",
  name: "Priya Sharma",
  email: "priya@example.com",
  phone: "9876543210",
};

beforeEach(() => {
  mockState.authUser = { phoneNumber: "+919876543210" };
  mockState.userDocExists = false;
  mockState.emailTaken = false;
  mockState.setDocData = null;
  mockState.customClaims = null;
});

describe("POST /api/auth/phone-signup — input validation (rejected before any DB call)", () => {
  it("rejects a missing uid", async () => {
    const res = await POST(req({ ...validBody, uid: undefined }));
    expect(res.status).toBe(400);
  });

  it("rejects a missing name", async () => {
    const res = await POST(req({ ...validBody, name: "" }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid email", async () => {
    const res = await POST(req({ ...validBody, email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("rejects a phone number that isn't a valid 10-digit Indian mobile", async () => {
    const res = await POST(req({ ...validBody, phone: "12345" }));
    expect(res.status).toBe(400);
  });

  it("requires company name and instagram handle when isEventManager is true", async () => {
    const res = await POST(req({ ...validBody, isEventManager: true }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/company|agency/i);
  });
});

describe("POST /api/auth/phone-signup — account creation", () => {
  it("rejects when the uid doesn't correspond to a real, currently verified Firebase Auth user", async () => {
    mockState.authUser = null;
    const res = await POST(req(validBody));
    expect(res.status).toBe(401);
  });

  it("rejects when the auth user's verified phone doesn't match the submitted phone", async () => {
    mockState.authUser = { phoneNumber: "+911111111111" };
    const res = await POST(req(validBody));
    expect(res.status).toBe(400);
  });

  it("returns 409 when a users doc already exists for this uid (no silent takeover)", async () => {
    mockState.userDocExists = true;
    const res = await POST(req(validBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/already exists/i);
  });

  it("returns 409 when the email is already linked to another account", async () => {
    mockState.emailTaken = true;
    const res = await POST(req(validBody));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("sets the client role custom claim and writes the users doc on success", async () => {
    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    expect(mockState.customClaims).toEqual({ role: "client" });
    expect(mockState.setDocData).toMatchObject({
      name: "Priya Sharma",
      email: "priya@example.com",
      phone: "+919876543210",
      role: "client",
    });
  });
});
