import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmail, notificationEmailHtml } from "@/lib/email/resend";
import type { NotifyPayload, EmailDetail } from "./types";

/** Server-side (Admin SDK) equivalent of notifyUser, for API routes. */
export async function notifyUserServer(uid: string, payload: NotifyPayload): Promise<void> {
  await adminDb.collection("users").doc(uid).collection("notifications").add({
    title: payload.title,
    message: payload.message,
    type: payload.type ?? "info",
    link: payload.link ?? null,
    is_read: false,
    created_at: FieldValue.serverTimestamp(),
  });
}

/**
 * Server-side fan-out to every user with one of the given roles — in-app
 * notification for each, plus a best-effort email (never blocks the in-app
 * write if a send fails). `linkForRole`, when given, resolves a per-role
 * deep link (admin and coordinator dashboards live at different paths for
 * the same event) — falls back to `payload.link` when omitted.
 */
async function notifyRolesServer(
  roles: string[],
  payload: NotifyPayload,
  details?: EmailDetail[],
  linkForRole?: (role: string) => string | undefined
): Promise<number> {
  const usersSnap = await adminDb.collection("users").where("role", "in", roles).get();
  if (usersSnap.empty) return 0;

  const linkFor = (role: string) => linkForRole?.(role) ?? payload.link;

  const batch = adminDb.batch();
  for (const doc of usersSnap.docs) {
    const ref = adminDb.collection("users").doc(doc.id).collection("notifications").doc();
    batch.set(ref, {
      title: payload.title,
      message: payload.message,
      type: payload.type ?? "info",
      link: linkFor(doc.data().role as string) ?? null,
      is_read: false,
      created_at: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  await Promise.all(
    usersSnap.docs.map((doc) => {
      const email = doc.data()?.email as string | undefined;
      if (!email) return Promise.resolve();
      const html = notificationEmailHtml({
        title: payload.title,
        message: payload.message,
        link: linkFor(doc.data().role as string),
        details,
      });
      return sendEmail({ to: email, subject: payload.title, html }).catch((err) => {
        console.error(`[notifyRolesServer] email to ${email} failed:`, err);
      });
    })
  );

  return usersSnap.size;
}

/**
 * Server-side fan-out to every admin — the shared implementation behind
 * /api/notify-admins and a genuine self-registration in /api/auth/register.
 * Both of those are "major event" cases, so this also emails every admin
 * (best-effort — a failed send never blocks the in-app notification).
 */
export async function notifyAllAdminsServer(payload: NotifyPayload): Promise<number> {
  return notifyRolesServer(["admin"], payload);
}

/**
 * Fan-out to every admin AND coordinator — used when an artist's profile
 * crosses the completeness threshold, so whoever reviews/verifies artists
 * finds out there's one ready, without needing to poll for it. `linkForRole`
 * lets the deep link differ per role (Admin > Artists vs Coordinator >
 * Verify Artists live at different paths).
 */
export async function notifyAdminsAndCoordinatorsServer(
  payload: NotifyPayload,
  details?: EmailDetail[],
  linkForRole?: (role: string) => string | undefined
): Promise<number> {
  return notifyRolesServer(["admin", "coordinator"], payload, details, linkForRole);
}

/** Server-side email for a single user, resolving their address from their user doc. */
export async function emailUserServer(uid: string, payload: NotifyPayload, details?: EmailDetail[]): Promise<void> {
  const userDoc = await adminDb.collection("users").doc(uid).get();
  const email = userDoc.exists ? (userDoc.data()?.email as string | undefined) : undefined;
  if (!email) return;

  const html = notificationEmailHtml({ title: payload.title, message: payload.message, link: payload.link, details });
  await sendEmail({ to: email, subject: payload.title, html }).catch((err) => {
    console.error(`[emailUserServer] email to ${email} failed:`, err);
  });
}
