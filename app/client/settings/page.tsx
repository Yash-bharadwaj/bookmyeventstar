import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SettingsClient } from "@/components/profile/SettingsClient";

export default async function ClientSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "client") redirect("/login");

  return (
    <DashboardLayout user={serialize(user)} title="Settings">
      <SettingsClient
        user={serialize(user)}
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
