import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArtistEarningsClient } from "./ArtistEarningsClient";

export default async function ArtistEarningsPage() {
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

  const { data: bookingIds } = await supabase
    .from("bookings")
    .select("id, event_date, total_amount, advance_amount, balance_amount, status, venue, city")
    .eq("artist_id", artistProfile?.id ?? "");

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .in("booking_id", bookingIds?.map((b) => b.id) ?? [])
    .eq("type", "artist_settlement")
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout user={profile} title="My Earnings">
      <ArtistEarningsClient payments={payments ?? []} bookings={bookingIds ?? []} />
    </DashboardLayout>
  );
}
