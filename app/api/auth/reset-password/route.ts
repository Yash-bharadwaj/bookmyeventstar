import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

/**
 * Sets a new password for the account behind `idToken`. This route no longer
 * accepts an identifier — the only way to reach it is by already holding a
 * fresh ID token for the target account, obtained either by completing phone
 * OTP verification (forgot-password's phone path) or by clicking Firebase's
 * emailed reset link and signing in with the temporary credential it grants
 * (forgot-password's email path). Previously this endpoint reset a password
 * given only a self-reported email/phone with no proof of ownership.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const idToken = String(body.idToken ?? "");
  const password = String(body.password ?? "");

  if (!idToken) {
    return NextResponse.json({ error: "Not verified — please start over." }, { status: 401 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Verification expired — please start over." }, { status: 401 });
  }

  try {
    await adminAuth.updateUser(uid, { password });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reset-password] updateUser:", err);
    return NextResponse.json({ error: "Could not reset password — please try again." }, { status: 500 });
  }
}
