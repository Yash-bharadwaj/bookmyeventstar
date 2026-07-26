import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
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

/** Server-side fan-out to every admin — the shared implementation behind /api/notify-admins. */
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
  return adminsSnap.size;
}
