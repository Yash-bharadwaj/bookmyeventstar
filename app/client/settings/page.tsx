import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SettingsClient } from "@/components/profile/SettingsClient";

export default async function ClientSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "client") redirect("/login");

  return (
    <DashboardLayout user={profile} title="Settings">
      <SettingsClient
        user={profile}
        notifications={[
          { key: "proposal_received", label: "New proposal received", description: "When your coordinator sends a proposal" },
          { key: "booking_confirmed", label: "Booking confirmed", description: "When your booking is confirmed" },
          { key: "event_reminder", label: "Event reminders", description: "Reminders before your upcoming event" },
          { key: "payment_due", label: "Payment reminders", description: "Reminders for pending payments" },
          { key: "new_message", label: "New messages", description: "When your coordinator sends a message" },
        ]}
        profileLink="/client/profile"
      />
    </DashboardLayout>
  );
}
