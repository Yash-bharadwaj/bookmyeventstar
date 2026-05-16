import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientMessagesClient } from "./ClientMessagesClient";

export default async function ClientMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "client") redirect("/login");

  const { data: rawEnquiries } = await supabase
    .from("enquiries")
    .select("id, event_type, coordinator:users!enquiries_coordinator_id_fkey(id,name,avatar_url)")
    .eq("client_id", user.id)
    .not("coordinator_id", "is", null)
    .order("updated_at", { ascending: false });

  const enquiries = (rawEnquiries ?? []).map((e: any) => ({
    id: e.id,
    event_type: e.event_type,
    coordinator: Array.isArray(e.coordinator) ? e.coordinator[0] ?? null : e.coordinator,
  }));

  return (
    <DashboardLayout user={profile} title="Messages">
      <ClientMessagesClient
        enquiries={enquiries}
        currentUserId={user.id}
        currentUserName={profile.name}
      />
    </DashboardLayout>
  );
}
