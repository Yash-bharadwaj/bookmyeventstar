import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

describe("loginSchema (dynamic email-or-phone identifier)", () => {
  it("accepts a valid email identifier", () => {
    const r = loginSchema.safeParse({ identifier: "user@example.com", password: "secret1" });
    expect(r.success).toBe(true);
  });

  it("accepts a valid 10-digit Indian mobile number", () => {
    const r = loginSchema.safeParse({ identifier: "9876543210", password: "secret1" });
    expect(r.success).toBe(true);
  });

  // KNOWN BUG (flagged, not fixed here): the login page's onSubmit slices the
  // last 10 digits before building the synthetic phone email, so it tolerates
  // a +91 prefix — but this zod refine requires an *exact* 10-digit match, so
  // typing the number with its country code fails validation before the form
  // ever submits. Very common input shape for an Indian phone number.
  it.fails("accepts a phone number with a +91 prefix and spaces (currently rejected — see comment)", () => {
    const r = loginSchema.safeParse({ identifier: "+91 98765 43210", password: "secret1" });
    expect(r.success).toBe(true);
  });

  it("rejects a number that isn't a valid Indian mobile (wrong leading digit)", () => {
    const r = loginSchema.safeParse({ identifier: "1234567890", password: "secret1" });
    expect(r.success).toBe(false);
  });

  it("rejects garbage that is neither an email nor a phone number", () => {
    const r = loginSchema.safeParse({ identifier: "not-an-identifier", password: "secret1" });
    expect(r.success).toBe(false);
  });

  it("rejects an empty identifier", () => {
    const r = loginSchema.safeParse({ identifier: "", password: "secret1" });
    expect(r.success).toBe(false);
  });

  it("rejects a password shorter than 6 characters", () => {
    const r = loginSchema.safeParse({ identifier: "user@example.com", password: "123" });
    expect(r.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const base = {
    name: "Priya Sharma",
    email: "priya@example.com",
    phone: "9876543210",
    password: "password123",
    confirmPassword: "password123",
    role: "client" as const,
  };

  it("accepts a fully valid registration payload", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("rejects mismatched password/confirmPassword", () => {
    const r = registerSchema.safeParse({ ...base, confirmPassword: "different" });
    expect(r.success).toBe(false);
  });

  it("rejects a password under 8 characters", () => {
    const r = registerSchema.safeParse({ ...base, password: "short1", confirmPassword: "short1" });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid role", () => {
    const r = registerSchema.safeParse({ ...base, role: "admin" });
    expect(r.success).toBe(false);
  });

  it("rejects a non-Indian-mobile phone number", () => {
    const r = registerSchema.safeParse({ ...base, phone: "12345" });
    expect(r.success).toBe(false);
  });
});
