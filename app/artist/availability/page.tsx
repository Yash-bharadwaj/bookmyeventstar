import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { ArtistAvailabilityClient } from "./ArtistAvailabilityClient";

export default async function ArtistAvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "artist") redirect("/login");

  const [availabilitySnap, bookingsSnap] = await Promise.all([
    adminDb.collection("artistProfiles").doc(user.id).collection("availability").get(),
    adminDb.collection("bookings").where("artist_id", "==", user.id).get(),
  ]);

  // Doc ID is the "YYYY-MM-DD" date string per the schema.
  const availability = availabilitySnap.docs.map((d) => ({ id: d.id, artist_id: user.id, date: d.id, ...d.data() }));

  // Real confirmed bookings always take precedence over anything the artist
  // self-sets — these dates should show as "booked" and be locked from
  // editing here, not just tracked as a manual toggle.
  const bookedDates = Array.from(new Set(
    bookingsSnap.docs
      .filter((d) => d.data().status !== "cancelled")
      .map((d) => d.data().event_date as string)
      .filter(Boolean)
  ));

  return (
    <ArtistAvailabilityClient
      artistProfileId={user.id}
      availability={serialize(availability) as any}
      bookedDates={bookedDates}
    />
  );
}
