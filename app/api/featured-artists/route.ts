import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Public, unauthenticated endpoint for the homepage's Featured Artists strip.
 * `artistProfiles` is publicly readable per firestore.rules, but `users`
 * (where the artist's display name lives) requires a signed-in caller —
 * correctly, since it also holds phone/email. An anonymous homepage visitor
 * has no session, so the previous client-side `getDoc(users/{uid})` call
 * always failed with "Missing or insufficient permissions". This route uses
 * the Admin SDK (bypasses rules) to return only the safe, already-public
 * fields — never phone/email.
 */
export async function GET() {
  const snap = await adminDb
    .collection("artistProfiles")
    .where("is_verified", "==", true)
    .where("is_listed", "==", true)
    .where("is_profile_complete", "==", true)
    .orderBy("rating", "desc")
    .limit(4)
    .get();

  const profiles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const userDocs = profiles.length
    ? await adminDb.getAll(...profiles.map((p) => adminDb.collection("users").doc(p.id)))
    : [];

  const artists = profiles.map((p, i) => {
    const u = userDocs[i]?.exists ? userDocs[i].data() : null;
    return {
      id: p.id,
      categories: (p as any).categories ?? [],
      cities: (p as any).cities ?? [],
      base_price: (p as any).base_price ?? 0,
      rating: (p as any).rating ?? 0,
      total_bookings: (p as any).total_bookings ?? 0,
      is_verified: (p as any).is_verified ?? false,
      user: u ? { name: u.name as string } : null,
    };
  });

  return NextResponse.json({ artists });
}
