import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

/**
 * Cleans up the bare Firebase Auth account that signInWithPhoneNumber creates
 * when forgot-password's phone path is used on a number that was never
 * linked to an existing account (e.g. a /register signup, which never
 * verifies phone). Left alone, that phantom account would permanently own
 * the phone number and break a later real signup attempt with it. Only ever
 * deletes a uid that has no matching `users/{uid}` Firestore doc, so a real
 * account can never be removed through this route.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const idToken = String(body.idToken ?? "");
  if (!idToken) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    if (userDoc.exists) {
      // Never delete a real, provisioned account through this route.
      return NextResponse.json({ error: "Not a stray account." }, { status: 400 });
    }
    await adminAuth.deleteUser(decoded.uid);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[delete-stray-phone-user]:", err);
    return NextResponse.json({ error: "Cleanup failed." }, { status: 500 });
  }
}
