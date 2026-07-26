import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";

export async function POST(req: NextRequest) {
  let idToken: unknown;
  try {
    ({ idToken } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: "Missing idToken." }, { status: 400 });
  }

  let uid: string;
  try {
    ({ uid } = await adminAuth.verifyIdToken(idToken));
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  // An admin-deactivated account shouldn't be able to start a new session —
  // `is_active` is only ever explicitly set to false by an admin action, so
  // a missing field (older docs) is treated as active, not blocked.
  const userDoc = await adminDb.collection("users").doc(uid).get();
  if (userDoc.exists && userDoc.data()?.is_active === false) {
    return NextResponse.json({ error: "This account has been deactivated. Contact support if this is unexpected." }, { status: 403 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // matches the ~1hr ID token lifetime; the client refreshes and re-syncs this
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
