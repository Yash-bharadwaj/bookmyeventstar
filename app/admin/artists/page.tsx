import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { getArtistsForVerification } from "@/lib/artist-verification-data";
import { ArtistVerificationClient } from "./AdminArtistsClient";

export default async function AdminArtistsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/login");

  const { artists, categoryNames } = await getArtistsForVerification();

  return (
    <ArtistVerificationClient artists={serialize(artists) as any} categories={categoryNames} />
  );
}
