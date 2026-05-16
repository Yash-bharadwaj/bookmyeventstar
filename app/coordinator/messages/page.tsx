import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CoordinatorMessagesClient } from "./CoordinatorMessagesClient";

export default async function CoordinatorMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "coordinator") redirect("/login");

  const { data: rawEnquiries } = await supabase
    .from("enquiries")
    .select("id, event_type, client:users!enquiries_client_id_fkey(id,name,avatar_url)")
    .eq("coordinator_id", user.id)
    .not("client_id", "is", null)
    .order("updated_at", { ascending: false });

  const enquiries = (rawEnquiries ?? []).map((e: any) => ({
    id: e.id,
    event_type: e.event_type,
    client: Array.isArray(e.client) ? e.client[0] ?? null : e.client,
  }));

  return (
    <DashboardLayout user={profile} title="Messages">
      <CoordinatorMessagesClient
        enquiries={enquiries}
        currentUserId={user.id}
        currentUserName={profile.name}
      />
    </DashboardLayout>
  );
}
