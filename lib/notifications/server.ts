import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmail, notificationEmailHtml } from "@/lib/email/resend";
import type { NotifyPayload } from "./types";

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
 * Server-side fan-out to every admin — the shared implementation behind
 * /api/notify-admins and a genuine self-registration in /api/auth/register.
 * Both of those are "major event" cases, so this also emails every admin
 * (best-effort — a failed send never blocks the in-app notification).
 */
export async function notifyAllAdminsServer(payload: NotifyPayload): Promise<number> {
  const adminsSnap = await adminDb.collection("users").where("role", "==", "admin").get();
  if (adminsSnap.empty) return 0;

  const batch = adminDb.batch();
  for (const doc of adminsSnap.docs) {
    const ref = adminDb.collection("users").doc(doc.id).collection("notifications").doc();
    batch.set(ref, {
      title: payload.title,
      message: payload.message,
      type: payload.type ?? "info",
      link: payload.link ?? null,
      is_read: false,
      created_at: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  const html = notificationEmailHtml({ message: payload.message, link: payload.link });
  await Promise.all(
    adminsSnap.docs.map((doc) => {
      const email = doc.data()?.email as string | undefined;
      if (!email) return Promise.resolve();
      return sendEmail({ to: email, subject: payload.title, html }).catch((err) => {
        console.error(`[notifyAllAdminsServer] email to ${email} failed:`, err);
      });
    })
  );

  return adminsSnap.size;
}

/** Server-side email for a single user, resolving their address from their user doc. */
export async function emailUserServer(uid: string, payload: NotifyPayload): Promise<void> {
  const userDoc = await adminDb.collection("users").doc(uid).get();
  const email = userDoc.exists ? (userDoc.data()?.email as string | undefined) : undefined;
  if (!email) return;

  const html = notificationEmailHtml({ message: payload.message, link: payload.link });
  await sendEmail({ to: email, subject: payload.title, html }).catch((err) => {
    console.error(`[emailUserServer] email to ${email} failed:`, err);
  });
}
