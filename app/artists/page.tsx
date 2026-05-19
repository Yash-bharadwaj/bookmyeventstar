import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

    let query = supabase
      .from("artist_profiles")
      .select(`
      id, user_id, bio, categories, cities, base_price, rating,
      total_bookings, is_verified, social_links, rider_notes,
      user:users!artist_profiles_user_id_fkey(name, avatar_url),
      media:artist_media(url, is_primary, type)
    `)
      .eq("is_verified", true)
      .eq("is_listed", true)
      .eq("is_profile_complete", true)
      .order("rating", { ascending: false });

  if (searchParams.category) {
    query = query.contains("categories", [searchParams.category]);
  }
  if (searchParams.city) {
    query = query.contains("cities", [searchParams.city]);
  }

  const [{ data: rawArtists }, { data: categoriesData }] = await Promise.all([
    query.limit(60),
    supabase.from("categories").select("name").order("name"),
  ]);

  const artists = (rawArtists ?? []).map((a: any) => ({
    ...a,
    pricing_details: a.pricing_details ?? {},
    user: Array.isArray(a.user) ? a.user[0] ?? null : a.user,
    media: a.media ?? [],
  }));

  const categoryNames = (categoriesData ?? []).map((c) => c.name);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
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

      <div className="pt-16">
        <Suspense fallback={<div className="p-8 text-center">Loading artists...</div>}>
          <ArtistsPageClient
            artists={artists}
            initialCategory={searchParams.category}
            initialCity={searchParams.city}
            categories={categoryNames}
          />
        </Suspense>
      </div>
    </div>
  );
}
