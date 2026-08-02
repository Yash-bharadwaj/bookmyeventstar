import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize, type AnyDoc } from "@/lib/firebase/firestore-utils";
import { ensureArtistSlug } from "@/lib/artist-slug";
import { ArtistProfileClient } from "./ArtistProfileClient";

export default async function ArtistProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "artist") redirect("/login");

  const [artistProfileSnap, mediaSnap, documentsSnap, categoriesSnap, citiesSnap] = await Promise.all([
    adminDb.collection("artistProfiles").doc(user.id).get(),
    adminDb.collection("artistProfiles").doc(user.id).collection("media").get(),
    adminDb.collection("artistProfiles").doc(user.id).collection("documents").get(),
    adminDb.collection("categories").orderBy("name").get(),
    adminDb.collection("cities").orderBy("name").get(),
  ]);

  let artistProfile = artistProfileSnap.exists ? ({ id: user.id, ...artistProfileSnap.data() } as AnyDoc) : null;
  if (artistProfile) {
    const slug = await ensureArtistSlug(user.id, user.name, artistProfile.slug);
    artistProfile = { ...artistProfile, slug };
  }
  const media = mediaSnap.docs.map((d) => ({ id: d.id, artist_id: user.id, ...d.data() }));
  const hasAadhaarDocument = documentsSnap.docs.some((d) => d.data().type === "Aadhaar Card");
  const categoryNames = categoriesSnap.docs.map((d) => d.data().name as string);
  const cityNames = citiesSnap.docs.map((d) => d.data().name as string);

  return (
    <ArtistProfileClient
      user={serialize(user)}
      artistProfile={serialize(artistProfile) as any}
      media={serialize(media) as any}
      hasAadhaarDocument={hasAadhaarDocument}
      categories={categoryNames}
      cities={cityNames}
    />
  );
}
