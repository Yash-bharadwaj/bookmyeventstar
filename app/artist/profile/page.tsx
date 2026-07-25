import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArtistProfileClient } from "./ArtistProfileClient";

export default async function ArtistProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "artist") redirect("/login");

  const [artistProfileSnap, mediaSnap, categoriesSnap] = await Promise.all([
    adminDb.collection("artistProfiles").doc(user.id).get(),
    adminDb.collection("artistProfiles").doc(user.id).collection("media").get(),
    adminDb.collection("categories").orderBy("name").get(),
  ]);

  const artistProfile = artistProfileSnap.exists ? { id: user.id, ...artistProfileSnap.data() } : null;
  const media = mediaSnap.docs.map((d) => ({ id: d.id, artist_id: user.id, ...d.data() }));
  const categoryNames = categoriesSnap.docs.map((d) => d.data().name as string);

  return (
    <DashboardLayout user={serialize(user)} title="My Profile">
      <ArtistProfileClient
        user={serialize(user)}
        artistProfile={serialize(artistProfile) as any}
        media={serialize(media) as any}
        categories={categoryNames}
      />
    </DashboardLayout>
  );
}
