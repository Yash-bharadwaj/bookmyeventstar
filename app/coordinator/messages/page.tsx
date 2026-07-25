import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { adminDb } from "@/lib/firebase/admin";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CoordinatorMessagesClient } from "./CoordinatorMessagesClient";

export default async function CoordinatorMessagesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "coordinator") redirect("/login");

  // Single equality filter (no orderBy) avoids needing a composite index here;
  // sorting/filtering on client_id + updated_at happens in JS below.
  const enquiriesSnap = await adminDb.collection("enquiries").where("coordinator_id", "==", user.id).get();

  const enquiriesRaw = enquiriesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((e: any) => !!e.client_id)
    .sort((a: any, b: any) => {
      const au = a.updated_at?.toMillis?.() ?? 0;
      const bu = b.updated_at?.toMillis?.() ?? 0;
      return bu - au;
    });

  const clientIds = Array.from(new Set(enquiriesRaw.map((e: any) => e.client_id))) as string[];
  const clientDocs = await Promise.all(clientIds.map((id: string) => adminDb.collection("users").doc(id).get()));
  const clientsById = Object.fromEntries(clientDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const enquiries = enquiriesRaw.map((e: any) => {
    const client: any = clientsById[e.client_id];
    return {
      id: e.id,
      event_type: e.event_type,
      client: client ? { id: e.client_id, name: client.name, avatar_url: client.avatar_url } : null,
    };
  });

  return (
    <DashboardLayout user={serialize(user)} title="Messages">
      <CoordinatorMessagesClient
        enquiries={enquiries}
        currentUserId={user.id}
        currentUserName={user.name}
      />
    </DashboardLayout>
  );
}
