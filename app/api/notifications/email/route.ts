import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";
import { emailUserServer } from "@/lib/notifications/server";

/**
 * Email counterpart to the in-app notifyUser/notifyUserInBatch — for the
 * events triggered from client-side code (enquiry assigned, proposal
 * response) rather than an existing server route, since the Resend API key
 * must never reach the browser. Mirrors firestore.rules' permissiveness for
 * in-app notification creation: any signed-in user may trigger one.
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const decoded = token ? await adminAuth.verifyIdToken(token).catch(() => null) : null;
  if (!decoded) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { uid, title, message, link, details } = await req.json();
  if (typeof uid !== "string" || !uid || typeof title !== "string" || typeof message !== "string" || !title.trim() || !message.trim()) {
    return NextResponse.json({ error: "uid, title, and message are required" }, { status: 400 });
  }
  if (title.length > 200 || message.length > 1000) {
    return NextResponse.json({ error: "title or message too long" }, { status: 400 });
  }
  const safeLink = typeof link === "string" && link.startsWith("/") ? link.slice(0, 200) : undefined;
  const safeDetails = Array.isArray(details)
    ? details
        .filter((d): d is { label: string; value: string } =>
          d && typeof d.label === "string" && typeof d.value === "string")
        .slice(0, 20)
        .map((d) => ({ label: d.label.slice(0, 100), value: d.value.slice(0, 500) }))
    : undefined;

  await emailUserServer(uid, { title, message, link: safeLink }, safeDetails);
  return NextResponse.json({ success: true });
}
