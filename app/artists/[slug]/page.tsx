import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { adminDb } from "@/lib/firebase/admin";
import { serialize, type AnyDoc } from "@/lib/firebase/firestore-utils";
import { getCurrentUser } from "@/lib/firebase/server";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ArtistProfilePageClient } from "./ArtistProfilePageClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookmyeventstar.com";

async function getArtistBySlug(slug: string, viewerRole?: string): Promise<AnyDoc | null> {
  const snap = await adminDb.collection("artistProfiles").where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data() as AnyDoc;
  // Deliberately only checks is_verified, not is_listed — is_listed controls
  // whether an artist shows up in /artists' browse/search results, but an
  // artist's own direct profile link (shared with a client, put in a bio,
  // etc.) should keep working regardless of that. is_verified is the actual
  // "is this a real, reviewed account" gate; an unverified profile still
  // 404s — except for admin/coordinator, who need to see the full profile
  // (bio, photos, everything a client would) to actually review it before
  // verifying, not just the summary card on Admin/Coordinator > Artists.
  const canPreviewUnverified = viewerRole === "admin" || viewerRole === "coordinator";
  if (!data.is_verified && !canPreviewUnverified) return null;

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
  if (!artist) return { title: "Artist not found", robots: { index: false, follow: false } };

  const category = artist.categories?.[0] ?? "Performer";
  const city = artist.cities?.[0] ?? "India";
  const title = `${artist.user.name} — ${category} in ${city}`;
  const description = artist.bio?.trim()
    ? artist.bio.trim().slice(0, 160)
    : `Book ${artist.user.name} for your next event on BookMyEventStar.`;
  const primaryPhoto = artist.media.find((m: any) => m.type === "photo" && m.is_primary)?.url
    ?? artist.media.find((m: any) => m.type === "photo")?.url
    ?? artist.user.avatar_url;
  const url = `/artists/${params.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "profile",
      url,
      ...(primaryPhoto ? { images: [{ url: primaryPhoto }] } : {}),
    },
    twitter: {
      card: primaryPhoto ? "summary_large_image" : "summary",
      title,
      description,
      ...(primaryPhoto ? { images: [primaryPhoto] } : {}),
    },
  };
}

export default async function ArtistProfilePage({ params }: { params: { slug: string } }) {
  const viewer = await getCurrentUser();
  const [artist, citiesSnap] = await Promise.all([
    getArtistBySlug(params.slug, viewer?.role),
    adminDb.collection("cities").orderBy("name").get(),
  ]);
  if (!artist) notFound();
  const cities = citiesSnap.docs.map((d) => ({ name: d.data().name as string, state: d.data().state as string }));

  const category = artist.categories?.[0] ?? "Performer";
  const city = artist.cities?.[0];
  const primaryPhoto = artist.media.find((m: any) => m.type === "photo" && m.is_primary)?.url
    ?? artist.media.find((m: any) => m.type === "photo")?.url
    ?? artist.user.avatar_url;

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: artist.user.name,
    url: `${SITE_URL}/artists/${params.slug}`,
    ...(primaryPhoto ? { image: primaryPhoto } : {}),
    ...(artist.bio?.trim() ? { description: artist.bio.trim() } : {}),
    jobTitle: category,
    ...(city ? { address: { "@type": "PostalAddress", addressLocality: city, addressCountry: "IN" } } : {}),
    ...(artist.base_price
      ? {
          makesOffer: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: artist.base_price,
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/artists/${params.slug}`,
          },
        }
      : {}),
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-3xl mx-auto px-4 h-20 flex items-center justify-between">
          <BrandLogo size="md" href="/" priority />
          <Link href="/artists" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← All Artists
          </Link>
        </div>
      </nav>

      {!artist.is_verified && (
        // Only reachable at all for admin/coordinator (see getArtistBySlug) —
        // an unverified profile isn't public yet, so make that unambiguous
        // to whoever's previewing it before they verify.
        <div className="fixed top-20 left-0 right-0 z-40 bg-amber-500 text-amber-950 text-sm font-medium text-center py-2">
          Preview only — this profile isn&apos;t verified yet, so it isn&apos;t publicly visible.
        </div>
      )}

      <div className={artist.is_verified ? "pt-20" : "pt-28"}>
        <ArtistProfilePageClient artist={serialize(artist) as any} cities={cities} />
      </div>
    </div>
  );
}
