import { randomUUID } from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { serialize } from "@/lib/firebase/firestore-utils";
import type { ShareLink, PublicArtistProfile } from "@/types";

const DEFAULT_EXPIRY_DAYS = 30;

export async function createShareLink(params: {
  artistIds: string[];
  createdBy: string;
  createdByRole: "admin" | "coordinator";
  label?: string;
  expiresInDays?: number;
}): Promise<string> {
  const token = randomUUID();
  const expiresInDays = params.expiresInDays ?? DEFAULT_EXPIRY_DAYS;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await adminDb.collection("shareLinks").doc(token).set({
    artist_ids: params.artistIds,
    created_by: params.createdBy,
    created_by_role: params.createdByRole,
    ...(params.label ? { label: params.label } : {}),
    created_at: FieldValue.serverTimestamp(),
    expires_at: expiresAt,
    revoked: false,
    view_count: 0,
  });

  return token;
}

/** Returns null if the token doesn't exist, is revoked, or has expired — the
 * public page collapses all three into the same "unavailable" state so it
 * never confirms/denies which case applies. */
export async function getShareLink(token: string): Promise<ShareLink | null> {
  const snap = await adminDb.collection("shareLinks").doc(token).get();
  if (!snap.exists) return null;

  const data = serialize({ id: snap.id, ...snap.data() }) as ShareLink;
  if (data.revoked) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;

  return data;
}

export async function revokeShareLink(token: string): Promise<void> {
  await adminDb.collection("shareLinks").doc(token).update({ revoked: true });
}

export async function incrementShareLinkViewCount(token: string): Promise<void> {
  await adminDb.collection("shareLinks").doc(token).update({ view_count: FieldValue.increment(1) });
}

/** Sanitization boundary for the public share page — fetches full artist
 * docs via the Admin SDK but builds each result field-by-field so a price or
 * contact-info field can never leak in by an accidental object spread. */
export async function getPublicArtistProfiles(artistIds: string[]): Promise<PublicArtistProfile[]> {
  if (artistIds.length === 0) return [];

  const [artistDocs, userDocs, mediaSnaps] = await Promise.all([
    adminDb.getAll(...artistIds.map((id) => adminDb.collection("artistProfiles").doc(id))),
    adminDb.getAll(...artistIds.map((id) => adminDb.collection("users").doc(id))),
    Promise.all(artistIds.map((id) => adminDb.collection("artistProfiles").doc(id).collection("media").get())),
  ]);

  const profiles: PublicArtistProfile[] = [];
  artistDocs.forEach((artistDoc, i) => {
    if (!artistDoc.exists) return;
    const a = artistDoc.data()!;
    const u = userDocs[i]?.exists ? userDocs[i].data()! : {};
    const media = mediaSnaps[i].docs.map((m) => m.data());

    profiles.push({
      id: artistDoc.id,
      name: u.name ?? "",
      bio: a.bio ?? "",
      categories: a.categories ?? [],
      cities: a.cities ?? [],
      area: a.area,
      languages: a.languages ?? [],
      rating: a.rating ?? 0,
      is_verified: a.is_verified ?? false,
      photos: media.filter((m) => m.type === "photo").map((m) => m.url).filter(Boolean),
      videos: media.filter((m) => m.type === "video").map((m) => m.url).filter(Boolean),
    });
  });

  return profiles;
}
