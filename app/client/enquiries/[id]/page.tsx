import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientEnquiryDetail } from "./ClientEnquiryDetail";

export default async function ClientEnquiryDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "client") redirect("/login");

  const { data: enquiry } = await supabase
    .from("enquiries")
    .select(`
      *,
      coordinator:users!enquiries_coordinator_id_fkey(id, name, email, phone)
    `)
    .eq("id", params.id)
    .eq("client_id", user.id)
    .single();

  if (!enquiry) notFound();

  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, status, quoted_price, validity_date, created_at, content, artists_proposed")
    .eq("enquiry_id", params.id)
    .order("created_at", { ascending: false });

  const e = {
    ...enquiry,
    coordinator: Array.isArray(enquiry.coordinator) ? enquiry.coordinator[0] ?? null : enquiry.coordinator,
  };

  return (
    <DashboardLayout user={profile} title="Enquiry Details">
      <ClientEnquiryDetail enquiry={e} proposals={proposals ?? []} />
    </DashboardLayout>
  );
}
