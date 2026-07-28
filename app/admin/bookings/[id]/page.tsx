import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { adminDb } from "@/lib/firebase/admin";
import { AdminBookingDetail } from "./AdminBookingDetail";

function toIso(v: any) {
  return v && typeof v.toDate === "function" ? v.toDate().toISOString() : v;
}

export default async function AdminBookingDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/login");

  const bookingSnap = await adminDb.collection("bookings").doc(params.id).get();
  if (!bookingSnap.exists) notFound();
  const bookingData: any = bookingSnap.data();

  const [enquirySnap, artistProfileSnap, tasksSnap, paymentsSnap, artistShareSettingSnap] = await Promise.all([
    bookingData.enquiry_id ? adminDb.collection("enquiries").doc(bookingData.enquiry_id).get() : Promise.resolve(null),
    bookingData.artist_id ? adminDb.collection("artistProfiles").doc(bookingData.artist_id).get() : Promise.resolve(null),
    adminDb.collection("bookings").doc(params.id).collection("tasks").get(),
    adminDb.collection("bookings").doc(params.id).collection("payments").get(),
    adminDb.collection("settings").doc("artist_share_pct").get(),
  ]);

  const artistSharePct = artistShareSettingSnap.exists ? Number(artistShareSettingSnap.data()?.value) || 70 : 70;

  const enquiryData: any = enquirySnap && enquirySnap.exists ? enquirySnap.data() : null;
  const artistProfileData: any = artistProfileSnap && artistProfileSnap.exists ? artistProfileSnap.data() : null;

  const [clientSnap, artistUserSnap, coordinatorSnap] = await Promise.all([
    enquiryData?.client_id ? adminDb.collection("users").doc(enquiryData.client_id).get() : Promise.resolve(null),
    bookingData.artist_id ? adminDb.collection("users").doc(bookingData.artist_id).get() : Promise.resolve(null),
    bookingData.coordinator_id ? adminDb.collection("users").doc(bookingData.coordinator_id).get() : Promise.resolve(null),
  ]);

  const payments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const booking = {
    id: bookingSnap.id,
    ...bookingData,
    created_at: toIso(bookingData.created_at),
    updated_at: toIso(bookingData.updated_at),
    enquiry: enquiryData
      ? {
          event_type: enquiryData.event_type,
          other_requirements: enquiryData.other_requirements,
          client: clientSnap && clientSnap.exists ? { id: clientSnap.id, ...clientSnap.data() } : null,
        }
      : null,
    artist: artistProfileData
      ? {
          id: bookingData.artist_id,
          user_id: bookingData.artist_id,
          categories: artistProfileData.categories ?? [],
          bio: artistProfileData.bio,
          user: artistUserSnap && artistUserSnap.exists ? artistUserSnap.data() : null,
        }
      : null,
    coordinator: coordinatorSnap && coordinatorSnap.exists ? { id: coordinatorSnap.id, ...coordinatorSnap.data() } : null,
    tasks: tasksSnap.docs.map((t) => ({ id: t.id, booking_id: bookingSnap.id, ...t.data() })),
    payments,
  };

  return <AdminBookingDetail booking={serialize(booking)} artistSharePct={artistSharePct} />;
}
