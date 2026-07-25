import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import Link from "next/link";
import { Suspense } from "react";
import { ArtistsPageClient } from "./ArtistsPageClient";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const metadata = {
  title: "Browse Artists",
  description: "Find and book top performers, singers, DJs, comedians and more across India",
};

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: { category?: string; city?: string };
}) {
  let query = adminDb
    .collection("artistProfiles")
    .where("is_verified", "==", true)
    .where("is_listed", "==", true)
    .where("is_profile_complete", "==", true)
    .orderBy("rating", "desc") as FirebaseFirestore.Query;

  // Firestore only supports a single array-contains clause per query — apply
  // one (category takes priority) here, and post-filter the other in JS
  // below on the already-narrowed result set.
  if (searchParams.category) {
    query = query.where("categories", "array-contains", searchParams.category);
  } else if (searchParams.city) {
    query = query.where("cities", "array-contains", searchParams.city);
  }

  const [artistsSnap, categoriesSnap] = await Promise.all([
    query.limit(60).get(),
    adminDb.collection("categories").orderBy("name").get(),
  ]);

  let rawArtists = artistsSnap.docs.map((d) => ({ id: d.id, user_id: d.id, ...d.data() }));
  if (searchParams.category && searchParams.city) {
    rawArtists = rawArtists.filter((a: any) => (a.cities ?? []).includes(searchParams.city));
  }

  const userDocs = rawArtists.length
    ? await adminDb.getAll(...rawArtists.map((a) => adminDb.collection("users").doc(a.id)))
    : [];
  const mediaSnaps = rawArtists.length
    ? await Promise.all(rawArtists.map((a) => adminDb.collection("artistProfiles").doc(a.id).collection("media").get()))
    : [];

  const artists = rawArtists.map((a: any, i) => {
    const u = userDocs[i]?.exists ? userDocs[i].data()! : {};
    return {
      ...a,
      pricing_details: a.pricing_details ?? {},
      user: { name: u.name ?? "", avatar_url: u.avatar_url },
      media: mediaSnaps[i].docs.map((d) => ({ url: d.data().url, is_primary: d.data().is_primary, type: d.data().type })),
    };
  });

  const categoryNames = categoriesSnap.docs.map((d) => d.data().name as string);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <BrandLogo size="md" href="/" priority />
          <div className="flex gap-3">
            <Link href="/enquiry" className="text-sm font-medium text-gold-600 hover:text-gold-700">
              Book Now
            </Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Login
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-20">
        <Suspense fallback={<div className="p-8 text-center">Loading artists...</div>}>
          <ArtistsPageClient
            artists={serialize(artists) as any}
            initialCategory={searchParams.category}
            initialCity={searchParams.city}
            categories={categoryNames}
          />
        </Suspense>
      </div>
    </div>
  );
}
