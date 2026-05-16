import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CoordinatorOverview } from "@/components/dashboard/CoordinatorOverview";

export default async function CoordinatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "coordinator") redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const [{ data: myEnquiries }, { data: myBookings }, { data: pendingTasks }] = await Promise.all([
    supabase
      .from("enquiries")
      .select("*, client:users!enquiries_client_id_fkey(name,email,phone)")
      .eq("coordinator_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("bookings")
      .select("*, artist:artist_profiles(*, user:users(name,avatar_url))")
      .eq("coordinator_id", user.id)
      .gte("event_date", today)
      .order("event_date")
      .limit(5),
    supabase
      .from("tasks")
      .select("*, booking:bookings(event_date, venue, city)")
      .eq("status", "pending")
      .in(
        "booking_id",
        (
          await supabase
            .from("bookings")
            .select("id")
            .eq("coordinator_id", user.id)
        ).data?.map((b) => b.id) ?? []
      )
      .order("due_date")
      .limit(10),
  ]);

  return (
    <DashboardLayout user={profile} title="My Dashboard">
      <CoordinatorOverview
        enquiries={myEnquiries ?? []}
        upcomingBookings={myBookings ?? []}
        pendingTasks={pendingTasks ?? []}
      />
    </DashboardLayout>
  );
}
