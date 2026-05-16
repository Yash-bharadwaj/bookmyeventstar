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

  const { data: rawBookings } = await supabase
    .from("bookings")
    .select("id, event_date, venue, city, advance_amount, total_amount, balance_amount, status, special_requirements, enquiry_id, artist_id, coordinator_id, created_at, enquiry:enquiries(event_type, client:users!enquiries_client_id_fkey(name,phone))")
    .eq("artist_id", artistProfile?.id ?? "")
    .order("event_date", { ascending: false });

  const bookings = (rawBookings ?? []).map((b: any) => ({
    ...b,
    enquiry: Array.isArray(b.enquiry)
      ? b.enquiry[0]
        ? { ...b.enquiry[0], client: Array.isArray(b.enquiry[0].client) ? b.enquiry[0].client[0] ?? null : b.enquiry[0].client }
        : null
      : b.enquiry,
  }));

  return (
    <DashboardLayout user={profile} title="My Bookings">
      <ArtistBookingsClient bookings={bookings} />
    </DashboardLayout>
  );
}
