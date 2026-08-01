import { db } from "@/lib/firebase/client";
import { collection, doc, addDoc, serverTimestamp, type WriteBatch } from "firebase/firestore";
import type { NotifyPayload, EmailDetail } from "./types";

/**
 * Writes a notification into another user's own notifications subcollection.
 * Allowed by firestore.rules (`allow create: if signedIn()` under
 * users/{uid}/notifications) so e.g. a coordinator can notify a client and
 * vice versa — every cross-role event in the app should go through this
 * instead of hand-rolling an addDoc call, so the shape stays consistent.
 */
export async function notifyUser(uid: string, payload: NotifyPayload): Promise<void> {
  await addDoc(collection(db, "users", uid, "notifications"), {
    title: payload.title,
    message: payload.message,
    type: payload.type ?? "info",
    link: payload.link ?? null,
    is_read: false,
    created_at: serverTimestamp(),
  });
}

/**
 * Same as notifyUser, but queues the write into an existing WriteBatch
 * instead of writing immediately — use this when the notification needs to
 * land atomically alongside another write (e.g. assigning an enquiry and
 * notifying the coordinator in one commit).
 */
export function notifyUserInBatch(batch: WriteBatch, uid: string, payload: NotifyPayload): void {
  batch.set(doc(collection(db, "users", uid, "notifications")), {
    title: payload.title,
    message: payload.message,
    type: payload.type ?? "info",
    link: payload.link ?? null,
    is_read: false,
    created_at: serverTimestamp(),
  });
}

/**
 * Fans out to every admin. Goes through a server route (Admin SDK) because
 * firestore.rules doesn't let a client — including an unauthenticated
 * visitor on the public enquiry form — query `users where role == admin`
 * directly. Never throws: admin notification is a best-effort side effect,
 * not something that should block the user's action if it fails.
 */
export async function notifyAllAdmins(payload: NotifyPayload): Promise<void> {
  await fetch("/api/notify-admins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

/**
 * Email counterpart to notifyUser, for the handful of "major event" cases
 * that should also land in the recipient's inbox, not just the bell icon
 * (e.g. an enquiry assignment, a proposal response). Best-effort — never
 * throws, so a failed send never blocks the action that triggered it.
 * `details` adds an optional key/value table to the email (not stored on the
 * bell notification) — use it when the recipient needs full context, e.g.
 * an enquiry's client/event/budget details on assignment.
 */
export async function emailUser(uid: string, payload: NotifyPayload, details?: EmailDetail[]): Promise<void> {
  await fetch("/api/notifications/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, ...payload, details }),
  }).catch(() => {});
}
