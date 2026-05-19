import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminEnquiryDetail } from "./AdminEnquiryDetail";

export default async function AdminEnquiryDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/login");

  const [{ data: enquiry }, { data: proposals }, { data: coordinators }] = await Promise.all([
    supabase
      .from("enquiries")
      .select("*, client:users!enquiries_client_id_fkey(name,email,phone), coordinator:users!enquiries_coordinator_id_fkey(name,email,phone)")
      .eq("id", params.id)
      .single(),
    supabase
      .from("proposals")
      .select("*")
      .eq("enquiry_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("users").select("id,name,email").eq("role", "coordinator").eq("is_active", true),
  ]);

  if (!enquiry) notFound();

  return (
    <DashboardLayout user={profile} title="Enquiry Detail">
      <AdminEnquiryDetail
        enquiry={enquiry}
        proposals={proposals ?? []}
        coordinators={coordinators ?? []}
      />
    </DashboardLayout>
  );
}
