import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientPaymentsClient } from "./ClientPaymentsClient";

export default async function ClientPaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "client") redirect("/login");

  const { data: enquiryIds } = await supabase
    .from("enquiries").select("id").eq("client_id", user.id);

  const { data: rawBookings } = await supabase
    .from("bookings").select("id, total_amount, advance_amount, balance_amount, event_date, venue, city, status, enquiry:enquiries(event_type)")
    .in("enquiry_id", enquiryIds?.map((e) => e.id) ?? []);

  const bookings = (rawBookings ?? []).map((b: any) => ({
    ...b,
    enquiry: Array.isArray(b.enquiry) ? b.enquiry[0] ?? null : b.enquiry,
  }));

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .in("booking_id", bookings.map((b) => b.id))
    .in("type", ["advance", "final"])
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout user={profile} title="Payments & Invoices">
      <ClientPaymentsClient bookings={bookings} payments={payments ?? []} />
    </DashboardLayout>
  );
}
