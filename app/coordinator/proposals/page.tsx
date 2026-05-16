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

  const [{ data: rawProposals }, { data: rawEnquiries }] = await Promise.all([
    supabase
      .from("proposals")
      .select("*, enquiry:enquiries(event_type, event_date, city, client:users!enquiries_client_id_fkey(name))")
      .eq("coordinator_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("enquiries")
      .select("id, event_type, event_date, city, client:users!enquiries_client_id_fkey(name)")
      .eq("coordinator_id", user.id)
      .in("status", ["assigned", "requirement_gathering", "shortlisting"])
      .order("created_at", { ascending: false }),
  ]);

  const proposals = (rawProposals ?? []).map((p: any) => ({
    ...p,
    enquiry: Array.isArray(p.enquiry) ? p.enquiry[0] ?? null : p.enquiry,
  }));

  const enquiries = (rawEnquiries ?? []).map((e: any) => ({
    ...e,
    client: Array.isArray(e.client) ? e.client[0] ?? null : e.client,
  }));

  return (
    <DashboardLayout user={profile} title="My Proposals">
      <CoordinatorProposalsClient
        proposals={proposals}
        coordinatorId={user.id}
        enquiries={enquiries}
      />
    </DashboardLayout>
  );
}
