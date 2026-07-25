import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/firebase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientOverview } from "@/components/dashboard/ClientOverview";
import { serialize } from "@/lib/firebase/firestore-utils";

/** Shallow, top-level-only Timestamp conversion — kept for the initial doc
 * mapping below, but NOT sufficient on its own: enriched objects that nest
 * another doc's raw data (coordinator/artist sub-objects) need the deep
 * `serialize()` pass applied at the very end, since Timestamps can be
 * buried arbitrarily deep once docs are merged into each other. */
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

export default async function ClientPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "client") redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  // Fetch every enquiry for this client once; sort/slice/filter the rest in JS
  // rather than issuing several more Firestore compound queries (and their
  // composite-index requirements) for what is always a small per-client set.
  // (A where(client_id ==) + orderBy(created_at) query DOES need a composite
  // index in this project — confirmed via a live-Firestore QA script — so it's
  // avoided here entirely rather than requiring that index to be deployed.)
  const enquiriesSnap = await adminDb.collection("enquiries").where("client_id", "==", user.id).get();
  const allEnquiries = enquiriesSnap.docs
    .map((d) => ({ id: d.id, ...toPlain(d.data()) }) as any)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const enquiriesById = Object.fromEntries(allEnquiries.map((e) => [e.id, e]));
  const enquiryIds = allEnquiries.map((e) => e.id);
  const recentEnquiries = allEnquiries.slice(0, 10);

  // Coordinators for the recent enquiries shown on this page
  const coordinatorIds = Array.from(new Set(recentEnquiries.map((e) => e.coordinator_id).filter(Boolean))) as string[];
  const coordinatorDocs = await Promise.all(coordinatorIds.map((id) => adminDb.collection("users").doc(id).get()));
  const coordinatorsById = Object.fromEntries(coordinatorDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
  const enrichedEnquiries = recentEnquiries.map((e) => ({
    ...e,
    coordinator: e.coordinator_id ? coordinatorsById[e.coordinator_id] ?? null : null,
  }));

  // Proposals across ALL of this client's enquiries
  let proposals: any[] = [];
  if (enquiryIds.length > 0) {
    const proposalSnaps = await Promise.all(
      chunk(enquiryIds, 30).map((ids) => adminDb.collection("proposals").where("enquiry_id", "in", ids).get())
    );
    proposals = proposalSnaps
      .flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data()) })))
      .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1));
  }
  const enrichedProposals = proposals.map((p: any) => {
    const enq = enquiriesById[p.enquiry_id];
    return {
      ...p,
      enquiry: enq ? { event_type: enq.event_type, event_date: enq.event_date, city: enq.city } : null,
    };
  });

  // Upcoming bookings (next 3). enquiry_id "in" combined with an event_date
  // range filter also needs a composite index (confirmed live) — fetch by
  // enquiry_id alone and filter/sort/slice the (small) result in JS instead.
  let bookings: any[] = [];
  if (enquiryIds.length > 0) {
    const bookingSnaps = await Promise.all(
      chunk(enquiryIds, 30).map((ids) => adminDb.collection("bookings").where("enquiry_id", "in", ids).get())
    );
    bookings = bookingSnaps
      .flatMap((snap) => snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data()) })))
      .filter((b: any) => b.event_date >= today)
      .sort((a: any, b: any) => (a.event_date > b.event_date ? 1 : -1))
      .slice(0, 3);
  }

  const artistIds = Array.from(new Set(bookings.map((b) => b.artist_id).filter(Boolean))) as string[];
  const [artistProfileDocs, artistUserDocs] = await Promise.all([
    Promise.all(artistIds.map((id) => adminDb.collection("artistProfiles").doc(id).get())),
    Promise.all(artistIds.map((id) => adminDb.collection("users").doc(id).get())),
  ]);
  const artistProfilesById = Object.fromEntries(artistProfileDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
  const artistUsersById = Object.fromEntries(artistUserDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
  const enrichedBookings = bookings.map((b) => {
    const artistUser = b.artist_id ? artistUsersById[b.artist_id] : null;
    return {
      ...b,
      artist: b.artist_id
        ? {
            ...(artistProfilesById[b.artist_id] ?? {}),
            user: artistUser ? { name: artistUser.name, avatar_url: artistUser.avatar_url } : null,
          }
        : null,
    };
  });

  return (
    <DashboardLayout user={serialize(user)} title="My Dashboard">
      <ClientOverview
        enquiries={serialize(enrichedEnquiries) as any}
        proposals={serialize(enrichedProposals) as any}
        upcomingBookings={serialize(enrichedBookings) as any}
        userName={user.name}
      />
    </DashboardLayout>
  );
}
