import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArtistOverview } from "@/components/dashboard/ArtistOverview";

export default async function ArtistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "artist") redirect("/login");

  const { data: artistProfile } = await supabase
    .from("artist_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const today = new Date().toISOString().split("T")[0];

  const [{ data: bookings }, { data: payments }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, enquiry:enquiries(event_type, client:users!enquiries_client_id_fkey(name))")
      .eq("artist_id", artistProfile?.id ?? "")
      .order("event_date", { ascending: false })
      .limit(10),
    supabase
      .from("payments")
      .select("*")
      .in(
        "booking_id",
        (
          await supabase
            .from("bookings")
            .select("id")
            .eq("artist_id", artistProfile?.id ?? "")
        ).data?.map((b) => b.id) ?? []
      )
      .eq("type", "artist_settlement")
      .eq("status", "paid"),
  ]);

  const totalEarnings = payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
  const upcomingBookings = bookings?.filter((b) => b.event_date >= today && b.status !== "cancelled") ?? [];
  const completedBookings = bookings?.filter((b) => b.status === "completed") ?? [];

  return (
    <DashboardLayout user={profile} title="My Dashboard">
      <ArtistOverview
        artistProfile={artistProfile}
        bookings={bookings ?? []}
        totalEarnings={totalEarnings}
        upcomingCount={upcomingBookings.length}
        completedCount={completedBookings.length}
      />
    </DashboardLayout>
  );
}
