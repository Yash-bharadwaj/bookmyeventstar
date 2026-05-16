import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminCoordinatorsClient } from "./AdminCoordinatorsClient";

export default async function AdminCoordinatorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/login");

  const [{ data: coordinators }, { data: allEnquiries }] = await Promise.all([
    supabase.from("users").select("*").eq("role", "coordinator").order("created_at"),
    supabase.from("enquiries").select("coordinator_id, status"),
  ]);

  return (
    <DashboardLayout user={profile} title="Coordinators">
      <AdminCoordinatorsClient coordinators={coordinators ?? []} enquiries={allEnquiries ?? []} />
    </DashboardLayout>
  );
}
