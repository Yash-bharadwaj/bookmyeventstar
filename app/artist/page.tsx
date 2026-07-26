import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize, type AnyDoc } from "@/lib/firebase/firestore-utils";
import { ArtistOverview } from "@/components/dashboard/ArtistOverview";

export default async function ArtistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "artist") redirect("/login");

  const artistProfileSnap = await adminDb.collection("artistProfiles").doc(user.id).get();
  const artistProfile = artistProfileSnap.exists ? { id: user.id, ...artistProfileSnap.data() } : null;

  const [photoCountSnap, bookingsSnap] = await Promise.all([
    adminDb.collection("artistProfiles").doc(user.id).collection("media").where("type", "==", "photo").count().get(),
    adminDb.collection("bookings").where("artist_id", "==", user.id).orderBy("event_date", "desc").limit(10).get(),
  ]);
  const artistPhotoCount = photoCountSnap.data().count;

  const rawBookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as AnyDoc);

  // Enrich with enquiry.event_type + client name — no joins in Firestore.
  const enquiryIds = Array.from(new Set(rawBookings.map((b) => b.enquiry_id as string | undefined).filter((v): v is string => !!v)));
  const enquiryDocs = enquiryIds.length
    ? await adminDb.getAll(...enquiryIds.map((id) => adminDb.collection("enquiries").doc(id)))
    : [];
  const enquiryMap = new Map(enquiryDocs.map((d, i) => [enquiryIds[i], d.exists ? d.data() : null]));

  const clientIds = Array.from(
    new Set(Array.from(enquiryMap.values()).map((e) => e?.client_id as string | undefined).filter((v): v is string => !!v))
  );
  const clientDocs = clientIds.length
    ? await adminDb.getAll(...clientIds.map((id) => adminDb.collection("users").doc(id)))
    : [];
  const clientMap = new Map(clientDocs.map((d, i) => [clientIds[i], d.exists ? d.data() : null]));

  const bookings = rawBookings.map((b) => {
    const enquiry = b.enquiry_id ? enquiryMap.get(b.enquiry_id as string) : null;
    return {
      ...b,
      enquiry: enquiry
        ? { event_type: enquiry.event_type, client: enquiry.client_id ? clientMap.get(enquiry.client_id as string) ?? undefined : undefined }
        : undefined,
    };
  });

  // Total earnings: paid artist_settlement payments across ALL of this
  // artist's bookings (payments now live under bookings/{id}/payments).
  const allBookingIdsSnap = await adminDb.collection("bookings").where("artist_id", "==", user.id).select().get();
  const allBookingIds = allBookingIdsSnap.docs.map((d) => d.id);
  const paymentSnaps = allBookingIds.length
    ? await Promise.all(
        allBookingIds.map((bId) =>
          adminDb.collection("bookings").doc(bId).collection("payments")
            .where("type", "==", "artist_settlement")
            .where("status", "==", "paid")
            .get()
        )
      )
    : [];
  const totalEarnings = paymentSnaps.reduce(
    (sum, snap) => sum + snap.docs.reduce((s, d) => s + (Number(d.data().amount) || 0), 0),
    0
  );

  const today = new Date().toISOString().split("T")[0];
  const upcomingBookings = bookings.filter((b: any) => b.event_date >= today && b.status !== "cancelled");
  const completedBookings = bookings.filter((b: any) => b.status === "completed");

  return (
    <ArtistOverview
      artistProfile={serialize(artistProfile) as any}
      bookings={serialize(bookings) as any}
      totalEarnings={totalEarnings}
      upcomingCount={upcomingBookings.length}
      completedCount={completedBookings.length}
      artistPhotoCount={artistPhotoCount}
      hasAvatar={!!user.avatar_url}
    />
  );
}
