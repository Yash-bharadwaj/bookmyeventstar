import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { getArtistsForVerification } from "@/lib/artist-verification-data";
import { ArtistVerificationClient } from "@/app/admin/artists/AdminArtistsClient";

export default async function CoordinatorVerifyArtistsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "coordinator") redirect("/login");

  const { artists, categoryNames } = await getArtistsForVerification();

  return (
    <ArtistVerificationClient artists={serialize(artists) as any} categories={categoryNames} canManageListing={false} />
  );
}
