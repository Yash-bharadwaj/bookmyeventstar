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
  let iat: number;
  try {
    ({ uid, iat } = await adminAuth.verifyIdToken(idToken));
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  // Multiple places sync this cookie independently and asynchronously —
  // useUser.ts's onIdTokenChanged fires on every token change (including the
  // very first sign-in event, before a brand-new Google user has even
  // finished picking a role/submitting the finish-signup form), while
  // finishGoogleSignup fires its own sync right after setting the role
  // claim. Nothing guarantees those requests land in the order they were
  // sent — a slow, older (pre-claim) request completing after the fresh one
  // would silently regress the cookie back to a claim-less token, which
  // desyncs middleware's claim-based role check from Firestore's and causes
  // an infinite /login redirect loop. Comparing `iat` (issued-at) against
  // whatever token is already in the cookie makes this last-write-wins race
  // safe: an older token can never overwrite a newer one, regardless of
  // which request happens to finish last.
  const existingToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (existingToken) {
    const existing = await adminAuth.verifyIdToken(existingToken).catch(() => null);
    if (existing && existing.uid === uid && existing.iat > iat) {
      return NextResponse.json({ success: true });
    }
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
