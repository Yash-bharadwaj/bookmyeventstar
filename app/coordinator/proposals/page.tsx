import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CoordinatorProposalsClient } from "./CoordinatorProposalsClient";

export default async function CoordinatorProposalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "coordinator") redirect("/login");

  const { data: proposals } = await supabase
    .from("proposals")
    .select("*, enquiry:enquiries(event_type, event_date, city, client:users!enquiries_client_id_fkey(name))")
    .eq("coordinator_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout user={profile} title="My Proposals">
      <CoordinatorProposalsClient proposals={proposals ?? []} coordinatorId={user.id} />
    </DashboardLayout>
  );
}
