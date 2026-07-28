import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize, type AnyDoc } from "@/lib/firebase/firestore-utils";
import { AdminBookingsClient } from "./AdminBookingsClient";

export default async function AdminBookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/login");

  const bookingsSnap = await adminDb.collection("bookings").orderBy("event_date", "desc").get();
  const rawBookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as AnyDoc);

  const enquiryIds = Array.from(new Set(rawBookings.map((b) => b.enquiry_id as string | undefined).filter((v): v is string => !!v)));
  const enquiryDocs = enquiryIds.length
    ? await adminDb.getAll(...enquiryIds.map((id) => adminDb.collection("enquiries").doc(id)))
    : [];
  const enquiryMap = new Map(enquiryDocs.map((d, i) => [enquiryIds[i], d.exists ? d.data() : null]));

  const userIds = Array.from(
    new Set([
      ...rawBookings.map((b) => b.artist_id as string | undefined),
      ...Array.from(enquiryMap.values()).map((e) => e?.client_id as string | undefined),
    ].filter((v): v is string => !!v))
  );
  const userDocs = userIds.length
    ? await adminDb.getAll(...userIds.map((id) => adminDb.collection("users").doc(id)))
    : [];
  const userMap = new Map(userDocs.map((d, i) => [userIds[i], d.exists ? d.data() : null]));

  const paymentsSnaps = await Promise.all(
    rawBookings.map((b) => adminDb.collection("bookings").doc(b.id).collection("payments").get())
  );

  const bookings = rawBookings.map((b, i) => {
    const enquiry = b.enquiry_id ? enquiryMap.get(b.enquiry_id as string) : null;
    const client = enquiry?.client_id ? userMap.get(enquiry.client_id as string) : null;
    const artist = b.artist_id ? userMap.get(b.artist_id as string) : null;
    const payments = paymentsSnaps[i].docs.map((d) => ({ id: d.id, ...d.data() }));
    return {
      ...b,
      event_type: enquiry?.event_type ?? "Event",
      client_name: client?.name ?? "—",
      artist_name: artist?.name ?? "—",
      payments,
    };
  });

  return <AdminBookingsClient bookings={serialize(bookings) as any} />;
}
