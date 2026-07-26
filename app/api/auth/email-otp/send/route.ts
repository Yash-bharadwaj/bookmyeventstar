import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmail, otpEmailHtml } from "@/lib/email/resend";

const RESEND_COOLDOWN_MS = 45_000;
const CODE_TTL_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    const emailLower = email.trim().toLowerCase();

    const ref = adminDb.collection("email_otp_codes").doc(emailLower);
    const existing = await ref.get();
    if (existing.exists) {
      const createdMs = existing.data()?.created_at?.toMillis?.() ?? 0;
      if (Date.now() - createdMs < RESEND_COOLDOWN_MS) {
        return NextResponse.json({ error: "Please wait before requesting another code." }, { status: 429 });
      }
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    await ref.set({
      code,
      expires_at: Date.now() + CODE_TTL_MS,
      attempts: 0,
      created_at: FieldValue.serverTimestamp(),
    });

    await sendEmail({
      to: emailLower,
      subject: "Your BookMyEventStar verification code",
      html: otpEmailHtml(code),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[email-otp/send] error:", err);
    return NextResponse.json({ error: "Could not send the code — please try again." }, { status: 500 });
  }
}
