import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArtistEarningsClient } from "./ArtistEarningsClient";

export default async function ArtistEarningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "artist") redirect("/login");

  const bookingsSnap = await adminDb
    .collection("bookings")
    .where("artist_id", "==", user.id)
    .select("event_date", "total_amount", "advance_amount", "balance_amount", "status", "venue", "city")
    .get();

  const bookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Payments now live under bookings/{id}/payments — fetch each booking's
  // artist_settlement payments in parallel and flatten.
  const paymentSnaps = bookings.length
    ? await Promise.all(
        bookings.map((b) =>
          adminDb.collection("bookings").doc(b.id).collection("payments")
            .where("type", "==", "artist_settlement")
            .get()
        )
      )
    : [];
  const payments = paymentSnaps
    .flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    .sort((a: any, b: any) => {
      const aTime = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
      const bTime = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
      return bTime - aTime;
    });

  return (
    <DashboardLayout user={serialize(user)} title="My Earnings">
      <ArtistEarningsClient payments={serialize(payments) as any} bookings={serialize(bookings) as any} />
    </DashboardLayout>
  );
}
