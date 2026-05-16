import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientOverview } from "@/components/dashboard/ClientOverview";

export default async function ClientPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "client") redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const [{ data: enquiries }, { data: proposals }, { data: bookings }] = await Promise.all([
    supabase
      .from("enquiries")
      .select("*, coordinator:users!enquiries_coordinator_id_fkey(name,phone)")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("proposals")
      .select("*, enquiry:enquiries(event_type,event_date,city)")
      .in(
        "enquiry_id",
        (await supabase.from("enquiries").select("id").eq("client_id", user.id)).data?.map((e) => e.id) ?? []
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*, artist:artist_profiles(*, user:users(name,avatar_url))")
      .in(
        "enquiry_id",
        (await supabase.from("enquiries").select("id").eq("client_id", user.id)).data?.map((e) => e.id) ?? []
      )
      .gte("event_date", today)
      .order("event_date")
      .limit(3),
  ]);

  return (
    <DashboardLayout user={profile} title="My Dashboard">
      <ClientOverview
        enquiries={enquiries ?? []}
        proposals={proposals ?? []}
        upcomingBookings={bookings ?? []}
        userName={profile.name}
      />
    </DashboardLayout>
  );
}
