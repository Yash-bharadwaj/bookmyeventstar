import { adminDb } from "@/lib/firebase/admin";
import { aggregateCompletionFromStoredProfile } from "@/lib/artist-profile-completion";

/**
 * Shared data-fetch behind both Admin > Artists and Coordinator > Verify
 * Artists (same underlying review queue, different role). Adds
 * profile_completion_percent per artist — computed the same way the
 * artist's own profile editor does (lib/artist-profile-completion.ts) —
 * so reviewers see the real number, not just the pass/fail
 * is_profile_complete badge. Also attaches each artist's uploaded
 * verification documents (Aadhaar, PAN, etc.) — private, not part of the
 * public /artists/[slug] page, but admin/coordinator need to see them to
 * actually review before verifying (storage.rules + firestore.rules both
 * already permit admin/coordinator read access to these).
 */
export async function getArtistsForVerification() {
  const [artistsSnap, categoriesSnap] = await Promise.all([
    adminDb.collection("artistProfiles").orderBy("created_at", "desc").get(),
    adminDb.collection("categories").orderBy("name").get(),
  ]);

  // artistProfiles/{uid} doc id IS the artist's uid — no user_id lookup needed.
  const rawArtists = artistsSnap.docs.map((d) => ({ id: d.id, user_id: d.id, ...d.data() }));

  const [userDocs, mediaSnaps, documentSnaps] = await Promise.all([
    rawArtists.length
      ? adminDb.getAll(...rawArtists.map((a) => adminDb.collection("users").doc(a.id)))
      : Promise.resolve([]),
    rawArtists.length
      ? Promise.all(rawArtists.map((a) => adminDb.collection("artistProfiles").doc(a.id).collection("media").get()))
      : Promise.resolve([]),
    rawArtists.length
      ? Promise.all(rawArtists.map((a) => adminDb.collection("artistProfiles").doc(a.id).collection("documents").get()))
      : Promise.resolve([]),
  ]);

  const artists = rawArtists.map((a: any, i) => {
    const u = userDocs[i]?.exists ? userDocs[i].data()! : {};
    const photoCount = mediaSnaps[i]?.docs.filter((m) => m.data().type === "photo").length ?? 0;
    const documents = (documentSnaps[i]?.docs ?? []).map((d) => ({ id: d.id, artist_id: a.id, ...d.data() }));
    const hasAadhaar = documents.some((d: any) => d.type === "Aadhaar Card");
    const { percent } = aggregateCompletionFromStoredProfile(a, photoCount, !!u.avatar_url, hasAadhaar);
    return {
      ...a,
      profile_completion_percent: percent,
      documents,
      user: {
        name: u.name ?? "",
        email: u.email ?? "",
        phone: u.phone ?? "",
        is_active: u.is_active ?? true,
        avatar_url: u.avatar_url,
      },
    };
  });

  const categoryNames = categoriesSnap.docs.map((d) => d.data().name as string);
  return { artists, categoryNames };
}
