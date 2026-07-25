import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize, type AnyDoc } from "@/lib/firebase/firestore-utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminEnquiriesClient } from "./AdminEnquiriesClient";

export default async function AdminEnquiriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/login");

  const [enquiriesSnap, coordinatorsSnap] = await Promise.all([
    adminDb.collection("enquiries").orderBy("created_at", "desc").get(),
    adminDb.collection("users").where("role", "==", "coordinator").where("is_active", "==", true).get(),
  ]);

  const rawEnquiries = enquiriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as AnyDoc);

  const userIds = Array.from(
    new Set(
      rawEnquiries.flatMap((e) => [e.client_id as string | null, e.coordinator_id as string | null]).filter((v): v is string => !!v)
    )
  );
  const userDocs = userIds.length
    ? await adminDb.getAll(...userIds.map((id) => adminDb.collection("users").doc(id)))
    : [];
  const userMap = new Map(userDocs.map((d, i) => [userIds[i], d.exists ? d.data() : null]));

  const enquiries = rawEnquiries.map((e) => ({
    ...e,
    client: e.client_id ? userMap.get(e.client_id as string) ?? undefined : undefined,
    coordinator: e.coordinator_id ? userMap.get(e.coordinator_id as string) ?? undefined : undefined,
  }));

  const coordinators = coordinatorsSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, name: data.name, email: data.email };
  });

  return (
    <DashboardLayout user={serialize(user)} title="All Enquiries">
      <AdminEnquiriesClient
        enquiries={serialize(enquiries) as any}
        coordinators={coordinators}
      />
    </DashboardLayout>
  );
}
