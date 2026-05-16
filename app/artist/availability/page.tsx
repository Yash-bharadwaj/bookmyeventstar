import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArtistAvailabilityClient } from "./ArtistAvailabilityClient";

export default async function ArtistAvailabilityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "artist") redirect("/login");

  const { data: artistProfile } = await supabase
    .from("artist_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: availability } = await supabase
    .from("availability")
    .select("*")
    .eq("artist_id", artistProfile?.id ?? "");

  return (
    <DashboardLayout user={profile} title="Availability Calendar">
      <ArtistAvailabilityClient
        artistProfileId={artistProfile?.id ?? ""}
        availability={availability ?? []}
      />
    </DashboardLayout>
  );
}
