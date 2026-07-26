import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { ArtistAvailabilityClient } from "./ArtistAvailabilityClient";

export default async function ArtistAvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "artist") redirect("/login");

  const availabilitySnap = await adminDb.collection("artistProfiles").doc(user.id).collection("availability").get();

  // Doc ID is the "YYYY-MM-DD" date string per the schema.
  const availability = availabilitySnap.docs.map((d) => ({ id: d.id, artist_id: user.id, date: d.id, ...d.data() }));

  return (
    <ArtistAvailabilityClient
      artistProfileId={user.id}
      availability={serialize(availability) as any}
    />
  );
}
