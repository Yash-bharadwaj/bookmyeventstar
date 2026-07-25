import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Fan out a notification to every admin user.
 *
 * Needed because firestore.rules only lets a signed-in user read `users/{uid}`
 * docs that are their own, or query the `users` collection at all if they are
 * a coordinator/admin (`isCoordinatorOrAdmin()`). A client (or an anonymous
 * visitor completing the public quick-enquiry form on /artists) can't run a
 * `where("role","==","admin")` list query against `users` directly — it's
 * denied — so that fan-out has to happen server-side via the Admin SDK.
 */
const ALLOWED_TYPES = ["info", "success", "warning", "error"];

export async function POST(req: NextRequest) {
  try {
    const { title, message, type, link } = await req.json();
    if (typeof title !== "string" || typeof message !== "string" || !title.trim() || !message.trim()) {
      return NextResponse.json({ error: "title and message are required" }, { status: 400 });
    }
    // This endpoint is intentionally unauthenticated (called from the public
    // quick-enquiry flow) — cap input length and constrain `type` so it can't
    // be abused to write arbitrarily large/malformed content into every
    // admin's notification feed.
    if (title.length > 200 || message.length > 1000) {
      return NextResponse.json({ error: "title or message too long" }, { status: 400 });
    }
    const safeType = ALLOWED_TYPES.includes(type) ? type : "info";
    const safeLink = typeof link === "string" && link.startsWith("/") ? link.slice(0, 200) : null;

    const adminsSnap = await adminDb.collection("users").where("role", "==", "admin").get();
    if (adminsSnap.empty) {
      return NextResponse.json({ success: true, notified: 0 });
    }

    const batch = adminDb.batch();
    for (const doc of adminsSnap.docs) {
      const ref = adminDb.collection("users").doc(doc.id).collection("notifications").doc();
      batch.set(ref, {
        title,
        message,
        type: safeType,
        is_read: false,
        link: safeLink,
        created_at: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    return NextResponse.json({ success: true, notified: adminsSnap.size });
  } catch (err) {
    console.error("[notify-admins] failed:", err);
    return NextResponse.json({ error: "Failed to notify admins" }, { status: 500 });
  }
}
