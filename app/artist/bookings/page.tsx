import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArtistBookingsClient } from "./ArtistBookingsClient";

export default async function ArtistBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "artist") redirect("/login");

  const { data: artistProfile } = await supabase
    .from("artist_profiles").select("id").eq("user_id", user.id).single();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, enquiry:enquiries(event_type, client:users!enquiries_client_id_fkey(name,phone))")
    .eq("artist_id", artistProfile?.id ?? "")
    .order("event_date", { ascending: false });

  return (
    <DashboardLayout user={profile} title="My Bookings">
      <ArtistBookingsClient bookings={bookings ?? []} />
    </DashboardLayout>
  );
}
