import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "artist";
}

/**
 * Lazily assigns a human-readable, unique slug the first time it's needed —
 * existing artists never had one, and new ones won't until this runs.
 * Idempotent: a no-op if `existingSlug` is already set. Not wrapped in a
 * transaction — a same-instant name collision between two artists is
 * negligible at this app's scale, not worth the complexity for a cosmetic
 * marketing link.
 */
export async function ensureArtistSlug(uid: string, name: string, existingSlug?: string | null): Promise<string> {
  if (existingSlug) return existingSlug;

  const base = slugify(name);
  const clash = await adminDb.collection("artistProfiles").where("slug", "==", base).limit(1).get();
  const slug = clash.empty || clash.docs[0].id === uid ? base : `${base}-${uid.slice(-5)}`;

  await adminDb.collection("artistProfiles").doc(uid).update({
    slug,
    updated_at: FieldValue.serverTimestamp(),
  });

  return slug;
}
