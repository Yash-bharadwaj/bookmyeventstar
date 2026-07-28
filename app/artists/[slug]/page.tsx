import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { adminDb } from "@/lib/firebase/admin";
import { serialize, type AnyDoc } from "@/lib/firebase/firestore-utils";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ArtistProfilePageClient } from "./ArtistProfilePageClient";

async function getArtistBySlug(slug: string): Promise<AnyDoc | null> {
  const snap = await adminDb.collection("artistProfiles").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data() as AnyDoc;
  // Same visibility gate the /artists directory itself applies — a link to
  // an unlisted/unverified/incomplete profile should 404, not leak a draft.
  if (!data.is_verified || !data.is_listed || !data.is_profile_complete) return null;

  const [userSnap, mediaSnap] = await Promise.all([
    adminDb.collection("users").doc(doc.id).get(),
    adminDb.collection("artistProfiles").doc(doc.id).collection("media").get(),
  ]);
  const user = userSnap.exists ? userSnap.data()! : {};

  return {
    ...data,
    id: doc.id,
    user_id: doc.id,
    pricing_details: data.pricing_details ?? {},
    user: { name: user.name ?? "", avatar_url: user.avatar_url },
    media: mediaSnap.docs.map((d) => ({ url: d.data().url, is_primary: d.data().is_primary, type: d.data().type })),
  };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const artist = await getArtistBySlug(params.slug);
  if (!artist) return { title: "Artist not found" };

  const category = artist.categories?.[0] ?? "Performer";
  const city = artist.cities?.[0] ?? "India";
  const title = `${artist.user.name} — ${category} in ${city}`;
  const description = artist.bio?.trim()
    ? artist.bio.trim().slice(0, 160)
    : `Book ${artist.user.name} for your next event on BookMyEventStar.`;
  const primaryPhoto = artist.media.find((m: any) => m.type === "photo" && m.is_primary)?.url
    ?? artist.media.find((m: any) => m.type === "photo")?.url
    ?? artist.user.avatar_url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(primaryPhoto ? { images: [{ url: primaryPhoto }] } : {}),
    },
  };
}

export default async function ArtistProfilePage({ params }: { params: { slug: string } }) {
  const artist = await getArtistBySlug(params.slug);
  if (!artist) notFound();

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-3xl mx-auto px-4 h-20 flex items-center justify-between">
          <BrandLogo size="md" href="/" priority />
          <Link href="/artists" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← All Artists
          </Link>
        </div>
      </nav>

      <div className="pt-20">
        <ArtistProfilePageClient artist={serialize(artist) as any} />
      </div>
    </div>
  );
}
