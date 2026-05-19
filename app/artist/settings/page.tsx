import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SettingsClient } from "@/components/profile/SettingsClient";

export default async function ArtistSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "artist") redirect("/login");

  return (
    <DashboardLayout user={profile} title="Settings">
      <SettingsClient
        user={profile}
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
