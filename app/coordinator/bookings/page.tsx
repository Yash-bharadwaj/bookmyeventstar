import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CoordinatorBookingsClient } from "./CoordinatorBookingsClient";

export default async function CoordinatorBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "coordinator") redirect("/login");

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      artist:artist_profiles(*, user:users(name,phone,avatar_url)),
      enquiry:enquiries(event_type, client:users!enquiries_client_id_fkey(name,phone)),
      tasks(*)
    `)
    .eq("coordinator_id", user.id)
    .order("event_date");

  return (
    <DashboardLayout user={profile} title="My Bookings">
      <CoordinatorBookingsClient bookings={bookings ?? []} />
    </DashboardLayout>
  );
}
