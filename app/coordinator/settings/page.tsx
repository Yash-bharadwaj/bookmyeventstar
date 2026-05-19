import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SettingsClient } from "@/components/profile/SettingsClient";

export default async function CoordinatorSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "coordinator") redirect("/login");

  return (
    <DashboardLayout user={profile} title="Settings">
      <SettingsClient
        user={profile}
        notifications={[
          { key: "new_enquiry_assigned", label: "New enquiry assigned", description: "When an admin assigns a new enquiry to you" },
          { key: "proposal_accepted", label: "Proposal accepted", description: "When a client accepts your proposal" },
          { key: "artist_booking_response", label: "Artist booking responses", description: "When an artist accepts or declines a booking" },
          { key: "follow_up_reminder", label: "Follow-up reminders", description: "Daily reminders for pending follow-ups" },
          { key: "new_message", label: "New messages", description: "When a client sends you a message" },
        ]}
        profileLink="/coordinator/profile"
      />
    </DashboardLayout>
  );
}
