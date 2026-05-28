import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

/** Map known Twilio error codes to user-friendly strings. */
function twilioSendErr(err: unknown): string {
  const code = (err as Record<string, unknown>)?.code as number | undefined;
  const msg  = ((err as Error)?.message ?? "").toLowerCase();

  if (code === 20003)               return "OTP service is mis-configured — please contact support.";
  if (code === 60200)               return "This number can't receive SMS. Please check the number and try again.";
  if (code === 60202 || code === 60203) return "Too many OTP requests — please wait a few minutes and try again.";
  if (code === 60205)               return "SMS is not supported on this number. Please use a mobile number.";
  if (msg.includes("unable to create")) return "Could not send OTP to this number. Please try again.";
  return "Failed to send OTP — please try again.";
}

export async function POST(req: NextRequest) {
  // ── parse ──────────────────────────────────────────────────────────────────
  let phone: unknown;
  try {
    ({ phone } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return NextResponse.json(
      { error: "Enter a valid 10-digit Indian mobile number." },
      { status: 400 }
    );
  }

  // ── dev fallback ───────────────────────────────────────────────────────────
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.warn("[OTP/send] Twilio not configured — dev mode, use 123456 as OTP.");
    return NextResponse.json({ success: true });
  }

  // ── Twilio Verify ──────────────────────────────────────────────────────────
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN!);
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({
        to: `+91${digits}`,
        channel: "sms",
        // Overrides the service display name inside the SMS body
        customFriendlyName: "BookMyEventStar",
        // locale "en" keeps Twilio's default compliant template structure
        locale: "en",
      });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[OTP/send] Twilio error:", err);
    return NextResponse.json({ error: twilioSendErr(err) }, { status: 502 });
  }
}
