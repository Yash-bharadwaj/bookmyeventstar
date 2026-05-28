import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function issueToken(phone: string): string {
  const secret = process.env.OTP_TOKEN_SECRET;
  if (!secret) throw new Error("OTP_TOKEN_SECRET is not set.");
  const expiry  = Date.now() + 10 * 60 * 1000; // 10 min
  const payload = `${phone}:${expiry}`;
  const mac     = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${mac}`).toString("base64url");
}

export async function POST(req: NextRequest) {
  // ── parse ──────────────────────────────────────────────────────────────────
  let phone: unknown, code: unknown;
  try {
    ({ phone, code } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const digits = String(phone ?? "").replace(/\D/g, "");
  const otp    = String(code ?? "").trim();

  if (!digits || !otp) {
    return NextResponse.json({ error: "Phone and OTP code are required." }, { status: 400 });
  }

  // ── verify OTP ─────────────────────────────────────────────────────────────
  if (!process.env.TWILIO_ACCOUNT_SID) {
    // Dev fallback
    if (otp !== "123456") {
      return NextResponse.json({ error: "Wrong OTP. (Dev mode: use 123456)" }, { status: 400 });
    }
  } else {
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN!);
      const check  = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
        .verificationChecks.create({ to: `+91${digits}`, code: otp });

      if (check.status === "pending") {
        return NextResponse.json({ error: "Incorrect OTP — please try again." }, { status: 400 });
      }
      if (check.status !== "approved") {
        // expired, cancelled, max-attempts, etc.
        return NextResponse.json(
          { error: "OTP expired or invalid. Please request a new one." },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error("[OTP/verify] Twilio error:", err);
      return NextResponse.json(
        { error: "Could not verify OTP right now — please try again." },
        { status: 502 }
      );
    }
  }

  // ── issue token ────────────────────────────────────────────────────────────
  let token: string;
  try {
    token = issueToken(digits);
  } catch (err) {
    console.error("[OTP/verify] issueToken error:", err);
    return NextResponse.json(
      { error: "Server configuration error — please contact support." },
      { status: 500 }
    );
  }

  // ── check if phone already registered ─────────────────────────────────────
  // If DB is unreachable we still proceed — complete route will handle it.
  const { data: existing, error: dbErr } = await admin
    .from("users")
    .select("id, name, email")
    .eq("phone", `+91${digits}`)
    .maybeSingle();

  if (dbErr) {
    console.error("[OTP/verify] DB lookup error:", dbErr.message);
    // Non-fatal: assume new user; complete route will catch duplicates properly.
  }

  return NextResponse.json({
    verified:  true,
    token,
    isNewUser: !existing,
    name:  existing?.name  ?? "",
    email: existing?.email ?? "",
  });
}
