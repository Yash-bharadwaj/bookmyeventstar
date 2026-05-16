import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CoordinatorEnquiryDetail } from "./CoordinatorEnquiryDetail";

export default async function CoordinatorEnquiryDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "coordinator") redirect("/login");

  const { data: enquiry } = await supabase
    .from("enquiries")
    .select(`
      *,
      client:users!enquiries_client_id_fkey(id, name, email, phone),
      coordinator:users!enquiries_coordinator_id_fkey(id, name, email, phone)
    `)
    .eq("id", params.id)
    .eq("coordinator_id", user.id)
    .single();

  if (!enquiry) notFound();

  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, status, quoted_price, validity_date, created_at, artists_proposed")
    .eq("enquiry_id", params.id)
    .order("created_at", { ascending: false });

  const e = {
    ...enquiry,
    client: Array.isArray(enquiry.client) ? enquiry.client[0] ?? null : enquiry.client,
    coordinator: Array.isArray(enquiry.coordinator) ? enquiry.coordinator[0] ?? null : enquiry.coordinator,
  };

  return (
    <DashboardLayout user={profile} title="Enquiry Details">
      <CoordinatorEnquiryDetail enquiry={e} proposals={proposals ?? []} coordinatorId={user.id} />
    </DashboardLayout>
  );
}
