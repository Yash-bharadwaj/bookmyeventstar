import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { adminDb } from "@/lib/firebase/admin";
import { CoordinatorBookingsClient } from "./CoordinatorBookingsClient";

function toIso(v: any) {
  return v && typeof v.toDate === "function" ? v.toDate().toISOString() : v;
}

export default async function CoordinatorBookingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "coordinator") redirect("/login");

  const bookingsSnap = await adminDb
    .collection("bookings")
    .where("coordinator_id", "==", user.id)
    .orderBy("event_date")
    .get();

  const bookingsRaw = bookingsSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, created_at: toIso(data.created_at), updated_at: toIso(data.updated_at) };
  });

  const artistIds = Array.from(new Set(bookingsRaw.map((b: any) => b.artist_id).filter(Boolean))) as string[];
  const enquiryIds = Array.from(new Set(bookingsRaw.map((b: any) => b.enquiry_id).filter(Boolean))) as string[];

  const [artistProfileDocs, artistUserDocs, enquiryDocs, taskSnaps] = await Promise.all([
    Promise.all(artistIds.map((id: string) => adminDb.collection("artistProfiles").doc(id).get())),
    Promise.all(artistIds.map((id: string) => adminDb.collection("users").doc(id).get())),
    Promise.all(enquiryIds.map((id: string) => adminDb.collection("enquiries").doc(id).get())),
    Promise.all(bookingsRaw.map((b: any) => adminDb.collection("bookings").doc(b.id).collection("tasks").get())),
  ]);

  const artistProfilesById = Object.fromEntries(artistProfileDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
  const artistUsersById = Object.fromEntries(artistUserDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
  const enquiriesById = Object.fromEntries(enquiryDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const clientIds = Array.from(new Set(Object.values(enquiriesById).map((e: any) => e.client_id).filter(Boolean))) as string[];
  const clientDocs = await Promise.all(clientIds.map((id: string) => adminDb.collection("users").doc(id).get()));
  const clientsById = Object.fromEntries(clientDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const bookings = bookingsRaw.map((b: any, i: number) => {
    const artistProfile: any = artistProfilesById[b.artist_id];
    const enquiry: any = b.enquiry_id ? enquiriesById[b.enquiry_id] : null;
    const client: any = enquiry?.client_id ? clientsById[enquiry.client_id] : null;
    return {
      ...b,
      artist: artistProfile
        ? { id: b.artist_id, categories: artistProfile.categories ?? [], user: artistUsersById[b.artist_id] ?? null }
        : undefined,
      enquiry: enquiry
        ? { event_type: enquiry.event_type, client: client ? { name: client.name, phone: client.phone } : null }
        : undefined,
      tasks: taskSnaps[i].docs.map((t) => ({ id: t.id, booking_id: b.id, ...t.data() })),
    };
  });

  return (
    <CoordinatorBookingsClient bookings={serialize(bookings) as any} />
  );
}
