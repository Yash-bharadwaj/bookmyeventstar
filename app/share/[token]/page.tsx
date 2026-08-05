import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { getShareLink, getPublicArtistProfiles, incrementShareLinkViewCount } from "@/lib/firebase/share-links";
import type { PublicArtistProfile } from "@/types";

export const dynamic = "force-dynamic";

function UnavailableNotice() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-navy-50 px-4">
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
  );
}

function ArtistCard({ artist }: { artist: PublicArtistProfile }) {
  const cover = artist.photos[0];
  return (
    <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
      {cover && (
        <div className="relative w-full aspect-video bg-navy-50">
          <Image src={cover} alt={artist.name} fill sizes="(max-width: 640px) 100vw, 480px" className="object-cover" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-navy-900">{artist.name}</h2>
          {artist.is_verified && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
              <BadgeCheck className="w-3.5 h-3.5" /> Verified
            </span>
          )}
        </div>

        {artist.categories.length > 0 && (
          <p className="text-sm text-gold-700 font-medium mt-1">{artist.categories.join(" · ")}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
          {artist.cities.length > 0 && (
            <span
              className="inline-flex items-start gap-1 min-w-0"
              title={[artist.area, ...artist.cities].filter(Boolean).join(", ")}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                {artist.area ? `${artist.area}, ` : ""}
                {artist.cities.slice(0, 4).join(", ")}
                {artist.cities.length > 4 && ` +${artist.cities.length - 4} more`}
              </span>
            </span>
          )}
          {artist.rating > 0 && (
            <span className="inline-flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 fill-gold-500 text-gold-500" /> {artist.rating.toFixed(1)}
            </span>
          )}
        </div>

        {artist.bio && <p className="text-sm text-navy-700 mt-3 whitespace-pre-line">{artist.bio}</p>}

        {artist.languages && artist.languages.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">Languages: {artist.languages.join(", ")}</p>
        )}

        {artist.photos.length > 1 && (
          <div className="grid grid-cols-4 gap-2 mt-4">
            {artist.photos.slice(1, 5).map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-navy-50">
                <Image src={url} alt="" fill sizes="120px" className="object-cover" />
              </div>
            ))}
          </div>
        )}
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

  return (
    <main className="min-h-screen bg-navy-50">
      <header className="border-b border-navy-100 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <span className="font-display font-semibold text-navy-900">BookMyEventStar</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-navy-900 mb-1">
          {artists.length === 1 ? "Artist profile" : `${artists.length} artist profiles`}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">Shared with you by the BookMyEventStar team.</p>

        <div className="grid gap-6 sm:grid-cols-2">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>

        <div className="mt-8 text-center bg-white rounded-2xl border border-navy-100 p-6">
          <p className="text-navy-900 font-medium mb-3">Interested in booking?</p>
          <Link
            href="/enquiry"
            className="inline-flex items-center justify-center rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 font-medium px-6 py-2.5 transition-colors"
          >
            Send an enquiry
          </Link>
        </div>
      </div>
    </main>
  );
}
