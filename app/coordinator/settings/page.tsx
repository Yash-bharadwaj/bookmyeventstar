import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { SettingsClient } from "@/components/profile/SettingsClient";

export default async function CoordinatorSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "coordinator") redirect("/login");

  return (
    <SettingsClient
      user={serialize(user)}
      notifications={[
        { key: "new_enquiry_assigned", label: "New enquiry assigned", description: "When an admin assigns a new enquiry to you" },
        { key: "proposal_accepted", label: "Proposal accepted", description: "When a client accepts your proposal" },
        { key: "artist_booking_response", label: "Artist booking responses", description: "When an artist accepts or declines a booking" },
        { key: "follow_up_reminder", label: "Follow-up reminders", description: "Daily reminders for pending follow-ups" },
        { key: "new_message", label: "New messages", description: "When a client sends you a message" },
      ]}
      profileLink="/coordinator/profile"
    />
  );
}
