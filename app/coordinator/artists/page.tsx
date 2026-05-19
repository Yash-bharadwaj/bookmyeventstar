import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArtistSearchClient } from "./ArtistSearchClient";

export default async function CoordinatorArtistsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "coordinator") redirect("/login");

  const [{ data: artists }, { data: enquiries }] = await Promise.all([
    supabase
      .from("artist_profiles")
      .select("*, user:users(name,email,phone,avatar_url), media:artist_media(url,is_primary,type)")
      .eq("is_verified", true)
      .eq("is_listed", true)
      .eq("is_profile_complete", true)
      .order("rating", { ascending: false }),

    supabase
      .from("enquiries")
      .select("id, event_type, event_date, city, budget_min, budget_max, client:users!enquiries_client_id_fkey(name)")
      .eq("coordinator_id", user.id)
      .in("status", ["assigned", "requirement_gathering", "shortlisting"])
      .order("event_date"),
  ]);

  const mappedEnquiries = (enquiries ?? []).map((e: any) => ({
    ...e,
    client: Array.isArray(e.client) ? e.client[0] ?? null : e.client,
  }));

  const mappedArtists = (artists ?? []).map((a: any) => ({
    ...a,
    user: Array.isArray(a.user) ? a.user[0] ?? null : a.user,
    media: Array.isArray(a.media) ? a.media : [],
  }));

  return (
    <DashboardLayout user={profile} title="Artist Search">
      <ArtistSearchClient artists={mappedArtists} enquiries={mappedEnquiries} />
    </DashboardLayout>
  );
}
