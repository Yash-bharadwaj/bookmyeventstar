import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CoordinatorCalendarClient } from "./CoordinatorCalendarClient";

export default async function CoordinatorCalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "coordinator") redirect("/login");

  const { data: rawBookings } = await supabase
    .from("bookings")
    .select("id, event_date, venue, city, status, enquiry:enquiries(event_type)")
    .eq("coordinator_id", user.id)
    .not("status", "eq", "cancelled");

  const bookings = (rawBookings ?? []).map((b: any) => ({
    ...b,
    enquiry: Array.isArray(b.enquiry) ? b.enquiry[0] ?? null : b.enquiry,
  }));

  return (
    <DashboardLayout user={profile} title="Event Calendar">
      <CoordinatorCalendarClient bookings={bookings} />
    </DashboardLayout>
  );
}
