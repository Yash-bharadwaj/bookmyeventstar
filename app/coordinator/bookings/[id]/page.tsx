import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CoordinatorBookingDetail } from "./CoordinatorBookingDetail";

export default async function CoordinatorBookingDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "coordinator") redirect("/login");

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id, event_date, venue, city, advance_amount, total_amount, balance_amount, status, special_requirements, enquiry_id, artist_id, coordinator_id, created_at,
      enquiry:enquiries(event_type, client:users!enquiries_client_id_fkey(id,name,email,phone)),
      artist:artist_profiles!bookings_artist_id_fkey(
        id, categories, bio,
        user:users!artist_profiles_user_id_fkey(name,email,phone)
      ),
      tasks:tasks(*)
    `)
    .eq("id", params.id)
    .eq("coordinator_id", user.id)
    .single();

  if (!booking) notFound();

  const rawEnquiry: any = Array.isArray(booking.enquiry) ? booking.enquiry[0] ?? null : booking.enquiry;
  const rawArtist: any = Array.isArray(booking.artist) ? booking.artist[0] ?? null : booking.artist;

  const b = {
    ...booking,
    enquiry: rawEnquiry ? {
      ...rawEnquiry,
      client: Array.isArray(rawEnquiry.client) ? rawEnquiry.client[0] ?? null : rawEnquiry.client,
    } : null,
    artist: rawArtist ? {
      ...rawArtist,
      user: Array.isArray(rawArtist.user) ? rawArtist.user[0] ?? null : rawArtist.user,
    } : null,
  };

  return (
    <DashboardLayout user={profile} title="Booking Details">
      <CoordinatorBookingDetail booking={b} />
    </DashboardLayout>
  );
}
