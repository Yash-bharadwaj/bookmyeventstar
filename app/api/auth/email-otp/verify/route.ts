import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { signEmailVerification } from "@/lib/email/verification-token";

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }
    const emailLower = String(email).trim().toLowerCase();

    const ref = adminDb.collection("email_otp_codes").doc(emailLower);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Code expired or not found — please request a new one." }, { status: 400 });
    }
    const data = snap.data()!;

    if (Date.now() > data.expires_at) {
      await ref.delete();
      return NextResponse.json({ error: "Code expired — please request a new one." }, { status: 400 });
    }
    if (data.attempts >= MAX_ATTEMPTS) {
      await ref.delete();
      return NextResponse.json({ error: "Too many attempts — please request a new code." }, { status: 429 });
    }
    if (String(code).trim() !== data.code) {
      await ref.update({ attempts: FieldValue.increment(1) });
      return NextResponse.json({ error: "Incorrect code." }, { status: 400 });
    }

    await ref.delete();
    const { token, expires } = signEmailVerification(emailLower);
    return NextResponse.json({ verified: true, token, expires });
  } catch (err) {
    console.error("[email-otp/verify] error:", err);
    return NextResponse.json({ error: "Something went wrong — please try again." }, { status: 500 });
  }
}
