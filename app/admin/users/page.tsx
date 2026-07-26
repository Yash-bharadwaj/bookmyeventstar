import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize, type AnyDoc } from "@/lib/firebase/firestore-utils";
import { AdminUsersClient } from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/login");

  // "in" queries don't need a composite index as long as there's no
  // combined orderBy on a different field — sorting happens client-side
  // below instead.
  const usersSnap = await adminDb
    .collection("users")
    .where("role", "in", ["client", "artist"])
    .get();

  const rawUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as AnyDoc);
  const artistIds = rawUsers.filter((u) => u.role === "artist").map((u) => u.id);

  const artistProfileDocs = artistIds.length
    ? await adminDb.getAll(...artistIds.map((id) => adminDb.collection("artistProfiles").doc(id)))
    : [];
  const profileMap = new Map(artistProfileDocs.map((d, i) => [artistIds[i], d.exists ? d.data() : null]));

  const users = rawUsers
    .map((u) => {
      const profile = u.role === "artist" ? profileMap.get(u.id) : null;
      return {
        ...u,
        is_verified: profile?.is_verified ?? null,
        is_listed: profile?.is_listed ?? null,
        categories: profile?.categories ?? null,
        rating: profile?.rating ?? null,
        total_bookings: profile?.total_bookings ?? null,
      } as AnyDoc;
    })
    .sort((a, b) => {
      const at = a.created_at?.toMillis?.() ?? 0;
      const bt = b.created_at?.toMillis?.() ?? 0;
      return bt - at;
    });

  return <AdminUsersClient users={serialize(users) as any} />;
}
