import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize, type AnyDoc } from "@/lib/firebase/firestore-utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArtistBookingsClient } from "./ArtistBookingsClient";

export default async function ArtistBookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "artist") redirect("/login");

  const bookingsSnap = await adminDb
    .collection("bookings")
    .where("artist_id", "==", user.id)
    .orderBy("event_date", "desc")
    .get();

  const rawBookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as AnyDoc);

  // Enrich with enquiry.event_type + client {name, phone} — no joins in Firestore.
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
    const client = enquiry?.client_id ? clientMap.get(enquiry.client_id as string) : null;
    return {
      ...b,
      enquiry: enquiry
        ? { event_type: enquiry.event_type, client: client ? { name: client.name, phone: client.phone } : null }
        : null,
    };
  });

  return (
    <DashboardLayout user={serialize(user)} title="My Bookings">
      <ArtistBookingsClient bookings={serialize(bookings) as any} />
    </DashboardLayout>
  );
}
