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

  const { data: artists } = await supabase
    .from("artist_profiles")
    .select("*, user:users(name,email,phone,avatar_url), media:artist_media(url,is_primary,type)")
    .eq("is_verified", true)
    .order("rating", { ascending: false });

  return (
    <DashboardLayout user={profile} title="Artist Search">
      <ArtistSearchClient artists={artists ?? []} />
    </DashboardLayout>
  );
}
