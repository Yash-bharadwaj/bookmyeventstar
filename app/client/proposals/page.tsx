import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientProposalsClient } from "./ClientProposalsClient";

export default async function ClientProposalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "client") redirect("/login");

  const { data: enquiryIds } = await supabase
    .from("enquiries")
    .select("id")
    .eq("client_id", user.id);

  const { data: proposals } = await supabase
    .from("proposals")
    .select(`
      *,
      enquiry:enquiries(event_type, event_date, city, location, other_requirements)
    `)
    .in("enquiry_id", enquiryIds?.map((e) => e.id) ?? [])
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout user={profile} title="My Proposals">
      <ClientProposalsClient proposals={proposals ?? []} clientId={user.id} />
    </DashboardLayout>
  );
}
