import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArtistProfileClient } from "./ArtistProfileClient";

export default async function ArtistProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "artist") redirect("/login");

  const [{ data: artistProfile }, { data: media }] = await Promise.all([
    supabase.from("artist_profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("artist_media").select("*").eq(
      "artist_id",
      (await supabase.from("artist_profiles").select("id").eq("user_id", user.id).single()).data?.id ?? ""
    ),
  ]);

  return (
    <DashboardLayout user={profile} title="My Profile">
      <ArtistProfileClient user={profile} artistProfile={artistProfile} media={media ?? []} />
    </DashboardLayout>
  );
}
