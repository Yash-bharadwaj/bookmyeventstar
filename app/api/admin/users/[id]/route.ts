import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";

/**
 * Admin-only user field updates (e.g. toggling a coordinator's `is_active`,
 * editing their name/phone from the Coordinators page).
 *
 * This exists because firestore.rules only lets a signed-in user update
 * their OWN `users/{uid}` doc (`request.auth.uid == uid`) — there's no
 * client-side admin override, by design, so admin-driven edits to another
 * user's doc must go through the Admin SDK here instead of a direct
 * client Firestore write (which would be denied).
 */
async function requireAdmin(): Promise<{ uid: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
  if (!decoded) return null;
  const callerDoc = await adminDb.collection("users").doc(decoded.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") return null;
  return { uid: decoded.uid };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.phone === "string") update.phone = body.phone.trim();
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  update.updated_at = FieldValue.serverTimestamp();

  try {
    await adminDb.collection("users").doc(params.id).update(update);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/users PATCH] failed:", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
