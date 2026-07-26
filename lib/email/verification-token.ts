import crypto from "crypto";

/**
 * Short-lived proof that an email address passed OTP verification, without
 * needing a signed-in Firebase session in between (the OTP verify and the
 * account-creation call are two separate unauthenticated requests). Mirrors
 * the HMAC-token pattern the old Twilio phone-OTP flow used for the same
 * problem.
 */
export function signEmailVerification(email: string, ttlMs = 10 * 60 * 1000) {
  const secret = process.env.EMAIL_VERIFICATION_SECRET;
  if (!secret) throw new Error("EMAIL_VERIFICATION_SECRET is not configured");
  const expires = Date.now() + ttlMs;
  const token = crypto.createHmac("sha256", secret).update(`${email.toLowerCase()}:${expires}`).digest("hex");
  return { token, expires };
}

export function verifyEmailVerification(email: string, token: unknown, expires: unknown): boolean {
  const secret = process.env.EMAIL_VERIFICATION_SECRET;
  if (!secret) throw new Error("EMAIL_VERIFICATION_SECRET is not configured");
  if (typeof token !== "string" || typeof expires !== "number") return false;
  if (Date.now() > expires) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${email.toLowerCase()}:${expires}`).digest("hex");
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
