import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProfileClient } from "@/components/profile/ProfileClient";

export default async function AdminProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/login");

  return (
    <DashboardLayout user={serialize(user)} title="My Profile">
      <ProfileClient user={serialize(user)} />
    </DashboardLayout>
  );
}
