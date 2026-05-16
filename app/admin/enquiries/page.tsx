import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminEnquiriesClient } from "./AdminEnquiriesClient";

export default async function AdminEnquiriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/login");

  const [{ data: enquiries }, { data: coordinators }] = await Promise.all([
    supabase
      .from("enquiries")
      .select("*, client:users!enquiries_client_id_fkey(name,email,phone), coordinator:users!enquiries_coordinator_id_fkey(name)")
      .order("created_at", { ascending: false }),
    supabase.from("users").select("id,name,email").eq("role", "coordinator").eq("is_active", true),
  ]);

  return (
    <DashboardLayout user={profile} title="All Enquiries">
      <AdminEnquiriesClient
        enquiries={enquiries ?? []}
        coordinators={coordinators ?? []}
      />
    </DashboardLayout>
  );
}
