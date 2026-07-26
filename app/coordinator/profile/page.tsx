import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { ProfileClient } from "@/components/profile/ProfileClient";

export default async function CoordinatorProfilePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "coordinator") redirect("/login");

  return (
    <ProfileClient user={serialize(user)} />
  );
}
