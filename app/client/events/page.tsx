import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { getCurrentUser } from "@/lib/firebase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientEventsClient } from "./ClientEventsClient";

function toPlain<T extends Record<string, any>>(data: T): T {
  const out: any = { ...data };
  for (const k in out) {
    const v = out[k];
    if (v && typeof v === "object" && typeof v.toDate === "function") {
      out[k] = v.toDate().toISOString();
    }
  }
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default async function ClientEventsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "client") redirect("/login");

  const enquiriesSnap = await adminDb.collection("enquiries").where("client_id", "==", user.id).get();
  const enquiriesById = Object.fromEntries(enquiriesSnap.docs.map((d) => [d.id, d.data()]));
  const enquiryIds = enquiriesSnap.docs.map((d) => d.id);

  let bookingDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  if (enquiryIds.length > 0) {
    const bookingSnaps = await Promise.all(
      chunk(enquiryIds, 30).map((ids) => adminDb.collection("bookings").where("enquiry_id", "in", ids).get())
    );
    bookingDocs = bookingSnaps.flatMap((snap) => snap.docs);
  }

  const rawBookings = bookingDocs
    .map((d) => ({ id: d.id, ...toPlain(d.data()) }) as any)
    .sort((a, b) => (a.event_date < b.event_date ? 1 : -1));

  const artistIds = Array.from(new Set(rawBookings.map((b) => b.artist_id).filter(Boolean))) as string[];
  const [artistProfileDocs, artistUserDocs, feedbackSnaps] = await Promise.all([
    Promise.all(artistIds.map((id) => adminDb.collection("artistProfiles").doc(id).get())),
    Promise.all(artistIds.map((id) => adminDb.collection("users").doc(id).get())),
    Promise.all(rawBookings.map((b) => adminDb.collection("bookings").doc(b.id).collection("feedback").get())),
  ]);
  const artistProfilesById = Object.fromEntries(artistProfileDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
  const artistUsersById = Object.fromEntries(artistUserDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const bookings = rawBookings.map((b, i) => {
    const enq = enquiriesById[b.enquiry_id] as any;
    const artistProfile = b.artist_id ? artistProfilesById[b.artist_id] : null;
    const artistUser = b.artist_id ? artistUsersById[b.artist_id] : null;
    return {
      ...b,
      enquiry: enq ? { event_type: enq.event_type } : null,
      artist: artistProfile
        ? {
            ...artistProfile,
            user: artistUser ? { name: artistUser.name, phone: artistUser.phone, avatar_url: artistUser.avatar_url } : null,
          }
        : null,
      feedback: feedbackSnaps[i].docs.map((d) => ({ id: d.id, ...toPlain(d.data()) })),
    };
  });

  return (
    <DashboardLayout user={serialize(user)} title="My Events">
      <ClientEventsClient bookings={serialize(bookings) as any} clientId={user.id} />
    </DashboardLayout>
  );
}
