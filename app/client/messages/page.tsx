import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { getCurrentUser } from "@/lib/firebase/server";
import { ClientMessagesClient } from "./ClientMessagesClient";

export default async function ClientMessagesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "client") redirect("/login");

  // Fetch all this client's enquiries and filter/sort in JS — avoids a
  // composite index for (client_id ==, coordinator_id != null, order by updated_at).
  const enquiriesSnap = await adminDb.collection("enquiries").where("client_id", "==", user.id).get();
  const withCoordinator = enquiriesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as any)
    .filter((e) => !!e.coordinator_id)
    .sort((a, b) => {
      const au = a.updated_at?.toMillis?.() ?? 0;
      const bu = b.updated_at?.toMillis?.() ?? 0;
      return bu - au;
    });

  const coordinatorIds = Array.from(new Set(withCoordinator.map((e) => e.coordinator_id))) as string[];
  const coordinatorDocs = await Promise.all(coordinatorIds.map((id) => adminDb.collection("users").doc(id).get()));
  const coordinatorsById = Object.fromEntries(
    coordinatorDocs.filter((d) => d.exists).map((d) => [d.id, d.data()])
  );

  const enquiries = withCoordinator.map((e) => {
    const coord = coordinatorsById[e.coordinator_id];
    return {
      id: e.id,
      event_type: e.event_type,
      coordinator: coord ? { id: e.coordinator_id, name: coord.name, avatar_url: coord.avatar_url } : null,
    };
  });

  return (
    <ClientMessagesClient
      enquiries={enquiries}
      currentUserId={user.id}
      currentUserName={user.name}
    />
  );
}
