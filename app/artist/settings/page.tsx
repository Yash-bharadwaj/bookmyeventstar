import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SettingsClient } from "@/components/profile/SettingsClient";

export default async function ArtistSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "artist") redirect("/login");

  return (
    <DashboardLayout user={serialize(user)} title="Settings">
      <SettingsClient
        user={serialize(user)}
        notifications={[
          { key: "new_booking_request", label: "New booking request", description: "When a coordinator creates a booking for you" },
          { key: "booking_status_change", label: "Booking status updates", description: "When your booking status changes" },
          { key: "payment_received", label: "Payment notifications", description: "When a payment or settlement is recorded" },
          { key: "new_message", label: "New messages", description: "When you receive a new message from a coordinator" },
        ]}
        profileLink="/artist/profile"
      />
    </DashboardLayout>
  );
}
