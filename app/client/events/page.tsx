import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientEventsClient } from "./ClientEventsClient";

export default async function ClientEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "client") redirect("/login");

  const { data: enquiryIds } = await supabase
    .from("enquiries").select("id").eq("client_id", user.id);

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      artist:artist_profiles(*, user:users(name, phone, avatar_url)),
      enquiry:enquiries(event_type),
      feedback(*)
    `)
    .in("enquiry_id", enquiryIds?.map((e) => e.id) ?? [])
    .order("event_date", { ascending: false });

  return (
    <DashboardLayout user={profile} title="My Events">
      <ClientEventsClient bookings={bookings ?? []} clientId={user.id} />
    </DashboardLayout>
  );
}
