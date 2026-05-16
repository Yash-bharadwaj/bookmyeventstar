import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";
import { ArtistsPageClient } from "./ArtistsPageClient";
import { Sparkles } from "lucide-react";

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
    .select("*, user:users(name,avatar_url), media:artist_media(url,is_primary,type)")
    .eq("is_verified", true)
    .order("rating", { ascending: false });

  if (searchParams.category) {
    query = query.contains("categories", [searchParams.category]);
  }
  if (searchParams.city) {
    query = query.contains("cities", [searchParams.city]);
  }

  const { data: artists } = await query.limit(60);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gold-gradient flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-navy-900" />
            </div>
            <span className="font-display font-bold text-sm">
              <span className="text-navy-900">BookMy</span>
              <span className="text-gradient-gold">EventStar</span>
            </span>
          </Link>
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
            artists={artists ?? []}
            initialCategory={searchParams.category}
            initialCity={searchParams.city}
          />
        </Suspense>
      </div>
    </div>
  );
}
