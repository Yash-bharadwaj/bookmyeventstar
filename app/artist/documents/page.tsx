import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { ArtistDocumentsClient } from "./ArtistDocumentsClient";

export default async function ArtistDocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "artist") redirect("/login");

  const documentsSnap = await adminDb
    .collection("artistProfiles")
    .doc(user.id)
    .collection("documents")
    .orderBy("created_at", "desc")
    .get();

  const documents = documentsSnap.docs.map((d) => ({ id: d.id, artist_id: user.id, ...d.data() }));

  return (
    <ArtistDocumentsClient artistProfileId={user.id} documents={serialize(documents) as any} />
  );
}
