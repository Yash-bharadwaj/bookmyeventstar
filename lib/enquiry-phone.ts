import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

/** Any phone digits → E.164-style. Strict validation deferred until OTP is live. */
export function toE164India(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (!d) throw new Error("Enter a mobile number");
  return `+91${d}`;
}

/** Placeholder email until user fills the form (must be unique in public.users). */
export function placeholderEmailForAuthUser(userId: string): string {
  const hex = userId.replace(/-/g, "");
  return `u${hex.slice(0, 24)}@verified.bmes.app`;
}

/**
 * After phone OTP, ensure a client row exists in public.users (links to auth.users).
 */
export async function ensureClientUserAfterOtp(session: Session): Promise<void> {
  const supabase = createClient();
  const uid = session.user.id;
  const phone = session.user.phone ?? "";
  const { data: existing } = await supabase.from("users").select("id").eq("id", uid).maybeSingle();
  if (existing) return;

  const { error } = await supabase.from("users").insert({
    id: uid,
    name: "Guest",
    email: placeholderEmailForAuthUser(uid),
    phone: phone || null,
    role: "client",
    is_active: true,
  });
  if (error && !error.message.includes("duplicate") && error.code !== "23505") {
    console.error("ensureClientUserAfterOtp", error);
    throw error;
  }
}

export async function sendPhoneOtp(e164Phone: string): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: e164Phone,
    options: { shouldCreateUser: true, channel: "sms" },
  });
  return { error: error ? new Error(error.message) : null };
}

export async function verifyPhoneOtp(e164Phone: string, token: string): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone: e164Phone,
    token: token.replace(/\D/g, ""),
    type: "sms",
  });
  if (error) return { error: new Error(error.message) };
  if (data.session) {
    try {
      await ensureClientUserAfterOtp(data.session);
    } catch (e) {
      return { error: e instanceof Error ? e : new Error("Could not create profile") };
    }
  }
  return { error: null };
}
