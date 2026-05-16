import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientEnquiriesClient } from "./ClientEnquiriesClient";

export default async function ClientEnquiriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "client") redirect("/login");

  const { data: rawEnquiries } = await supabase
    .from("enquiries")
    .select("*, coordinator:users!enquiries_coordinator_id_fkey(name,phone)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const enquiries = (rawEnquiries ?? []).map((e) => ({
    ...e,
    coordinator: Array.isArray(e.coordinator) ? (e.coordinator[0] ?? null) : e.coordinator,
  }));

  return (
    <DashboardLayout user={profile} title="My Enquiries">
      <ClientEnquiriesClient enquiries={enquiries} />
    </DashboardLayout>
  );
}
