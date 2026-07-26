import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { AdminArtistsClient } from "./AdminArtistsClient";

export default async function AdminArtistsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/login");

  const [artistsSnap, categoriesSnap] = await Promise.all([
    adminDb.collection("artistProfiles").orderBy("created_at", "desc").get(),
    adminDb.collection("categories").orderBy("name").get(),
  ]);

  // artistProfiles/{uid} doc id IS the artist's uid — no user_id lookup needed.
  const rawArtists = artistsSnap.docs.map((d) => ({ id: d.id, user_id: d.id, ...d.data() }));
  const userDocs = rawArtists.length
    ? await adminDb.getAll(...rawArtists.map((a) => adminDb.collection("users").doc(a.id)))
    : [];

  const artists = rawArtists.map((a, i) => {
    const u = userDocs[i]?.exists ? userDocs[i].data()! : {};
    return {
      ...a,
      user: {
        name: u.name ?? "",
        email: u.email ?? "",
        phone: u.phone ?? "",
        is_active: u.is_active ?? true,
        avatar_url: u.avatar_url,
      },
    };
  });

  const categoryNames = categoriesSnap.docs.map((d) => d.data().name as string);

  return (
    <AdminArtistsClient artists={serialize(artists) as any} categories={categoryNames} />
  );
}
