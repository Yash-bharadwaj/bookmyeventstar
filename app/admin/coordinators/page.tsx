import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { AdminCoordinatorsClient } from "./AdminCoordinatorsClient";

export default async function AdminCoordinatorsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/login");

  const [coordinatorsSnap, enquiriesSnap] = await Promise.all([
    adminDb.collection("users").where("role", "==", "coordinator").orderBy("created_at").get(),
    adminDb.collection("enquiries").select("coordinator_id", "status").get(),
  ]);

  const coordinators = coordinatorsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const enquiries = enquiriesSnap.docs.map((d) => d.data());

  return (
    <AdminCoordinatorsClient
      coordinators={serialize(coordinators) as any}
      enquiries={serialize(enquiries) as any}
    />
  );
}
