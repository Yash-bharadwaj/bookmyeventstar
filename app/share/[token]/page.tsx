import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, MapPin, Star, Languages } from "lucide-react";
import { getShareLink, getPublicArtistProfiles, incrementShareLinkViewCount } from "@/lib/firebase/share-links";
import { ArtistPhotoGallery } from "@/components/shared/ArtistPhotoGallery";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { PublicArtistProfile } from "@/types";

export const dynamic = "force-dynamic";

// Without this, every share link showed the same generic site-wide title
// and description in link previews (WhatsApp, iMessage, etc.) regardless of
// which artist was actually shared — not wrong, just not useful for
// whoever's deciding whether to tap the link.
export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const shareLink = await getShareLink(params.token);
  if (!shareLink) return { title: "Artist profile", robots: { index: false, follow: false } };

  const artists = await getPublicArtistProfiles(shareLink.artist_ids);
  if (artists.length === 0) return { title: "Artist profile", robots: { index: false, follow: false } };

  const isSingle = artists.length === 1;
  const title = isSingle
    ? `${artists[0].name} — Artist Profile`
    : `${artists.length} Artist Profiles — ${artists.map((a) => a.name).join(", ")}`;
  const description = isSingle
    ? [artists[0].categories.join(", "), artists[0].cities[0]].filter(Boolean).join(" · ") ||
      "View this artist's profile on BookMyEventStar."
    : `Shared artist profiles: ${artists.map((a) => a.name).join(", ")}.`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description },
    twitter: { title, description },
  };
}

function PageHeader() {
  return (
    <header className="border-b border-navy-100 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3">
        <BrandLogo href="/" size="sm" priority />
      </div>
    </header>
  );
}

function UnavailableNotice() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white">
      <PageHeader />
      <main className="flex items-center justify-center px-4 py-20">
        <div className="max-w-sm w-full text-center bg-white rounded-2xl border border-navy-100 shadow-sm p-8">
          <h1 className="text-xl font-semibold text-navy-900 mb-2">This link is no longer available</h1>
          <p className="text-sm text-muted-foreground mb-6">
            It may have expired or been withdrawn. Send us your requirements directly instead.
          </p>
          <Link
            href="/enquiry"
            className="inline-flex items-center justify-center rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 font-medium px-5 py-2.5 transition-colors"
          >
            Raise an enquiry
          </Link>
        </div>
      </main>
    </div>
  );
}

function CityLine({ artist }: { artist: PublicArtistProfile }) {
  if (artist.cities.length === 0) return null;
  const full = [artist.area, ...artist.cities].filter(Boolean).join(", ");
  return (
    <span className="inline-flex items-start gap-1 min-w-0" title={full}>
      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>
        {artist.area ? `${artist.area}, ` : ""}
        {artist.cities.slice(0, 4).join(", ")}
        {artist.cities.length > 4 && ` +${artist.cities.length - 4} more`}
      </span>
    </span>
  );
}

function ArtistDetails({ artist }: { artist: PublicArtistProfile }) {
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-xl font-semibold text-navy-900">{artist.name}</h2>
        {artist.is_verified && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
            <BadgeCheck className="w-3.5 h-3.5" /> Verified
          </span>
        )}
      </div>

      {artist.categories.length > 0 && (
        <p className="text-sm text-gold-700 font-medium mt-1">{artist.categories.join(", ")}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
        <CityLine artist={artist} />
        {artist.rating > 0 && (
          <span className="inline-flex items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 fill-gold-500 text-gold-500" /> {artist.rating.toFixed(1)}
          </span>
        )}
      </div>

      {artist.languages && artist.languages.length > 0 && (
        <p className="inline-flex items-center gap-1.5 text-sm text-navy-700 mt-2">
          <Languages className="w-3.5 h-3.5 text-navy-400 shrink-0" />
          {artist.languages.join(", ")}
        </p>
      )}

      {artist.bio && <p className="text-sm text-navy-700 mt-3 leading-relaxed whitespace-pre-line">{artist.bio}</p>}
    </>
  );
}

/** Single-artist share — full width, side-by-side on desktop (gallery left,
 * details right), stacked on mobile. A lone card stuck inside a 2-column
 * grid used to sit at half width even on a wide desktop screen, looking like
 * a mobile card that never adapted up — this renders outside that grid. */
function SingleArtistProfile({ artist }: { artist: PublicArtistProfile }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden md:flex">
      <div className="md:w-[380px] md:shrink-0">
        <ArtistPhotoGallery photos={artist.photos} name={artist.name} aspect="aspect-[4/3] md:aspect-auto md:h-full" />
      </div>
      <div className="p-5 md:p-7 md:flex-1 md:min-w-0">
        <ArtistDetails artist={artist} />
      </div>
    </div>
  );
}

/** Multi-artist share — a grid of narrower cards (photo on top, details
 * below). Each grid cell stays narrow even on desktop, so the side-by-side
 * layout used for a single profile wouldn't fit well here. */
function ArtistGridCard({ artist }: { artist: PublicArtistProfile }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
      <ArtistPhotoGallery photos={artist.photos} name={artist.name} />
      <div className="p-5">
        <ArtistDetails artist={artist} />
      </div>
    </div>
  );
}

export default async function SharedArtistProfilePage({ params }: { params: { token: string } }) {
  const shareLink = await getShareLink(params.token);
  if (!shareLink) return <UnavailableNotice />;

  const artists = await getPublicArtistProfiles(shareLink.artist_ids);
  if (artists.length === 0) return <UnavailableNotice />;

  incrementShareLinkViewCount(params.token).catch(() => {});

  const isSingle = artists.length === 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-50 to-white">
      <PageHeader />

      <main className={`mx-auto px-4 sm:px-6 py-6 sm:py-10 ${isSingle ? "max-w-4xl" : "max-w-5xl"}`}>
        <h1 className="text-xl sm:text-2xl font-semibold text-navy-900 mb-1">
          {isSingle ? "Artist profile" : `${artists.length} artist profiles`}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">Shared with you by the BookMyEventStar team.</p>

        {isSingle ? (
          <SingleArtistProfile artist={artists[0]} />
        ) : (
          <div className="grid gap-5 sm:gap-6 sm:grid-cols-2">
            {artists.map((artist) => (
              <ArtistGridCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center bg-white rounded-2xl border border-navy-100 shadow-sm p-6 sm:p-8">
          <p className="text-navy-900 font-medium mb-3">Interested in booking?</p>
          <Link
            href="/enquiry"
            className="inline-flex items-center justify-center rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 font-medium px-6 py-2.5 transition-colors"
          >
            Send an enquiry
          </Link>
        </div>
      </main>
    </div>
  );
}
