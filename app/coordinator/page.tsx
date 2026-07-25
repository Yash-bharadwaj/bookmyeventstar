import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { adminDb } from "@/lib/firebase/admin";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CoordinatorOverview } from "@/components/dashboard/CoordinatorOverview";

function toIso(v: any) {
  return v && typeof v.toDate === "function" ? v.toDate().toISOString() : v;
}

export default async function CoordinatorPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "coordinator") redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  // Two separate enquiry reads mirror the old two-query approach: one capped
  // + ordered for the "recent enquiries" table, one unfiltered (equality
  // only, so no composite index needed) so the follow-up scan below never
  // misses an older enquiry that the capped/ordered list has since dropped.
  const [enquiriesSnap, allEnquiriesSnap, allBookingsSnap, workloadMaxSnap] = await Promise.all([
    adminDb.collection("enquiries").where("coordinator_id", "==", user.id).orderBy("created_at", "desc").limit(20).get(),
    adminDb.collection("enquiries").where("coordinator_id", "==", user.id).get(),
    adminDb.collection("bookings").where("coordinator_id", "==", user.id).get(),
    adminDb.collection("settings").doc("coordinator_workload_max").get(),
  ]);

  const workloadMax = workloadMaxSnap.exists ? Number(workloadMaxSnap.data()?.value) || 8 : 8;

  const myEnquiries = enquiriesSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, created_at: toIso(data.created_at), updated_at: toIso(data.updated_at) };
  });

  const allEnquiries = allEnquiriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const activeCount = allEnquiries.filter((e: any) => !["completed", "cancelled"].includes(e.status)).length;
  const completedCount = allEnquiries.filter((e: any) => e.status === "completed").length;
  const conversionPct = allEnquiries.length ? Math.round((completedCount / allEnquiries.length) * 100) : 0;
  const performance = { conversionPct, activeCount, workloadMax, isOverloaded: activeCount > workloadMax };

  const allBookings = allBookingsSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, created_at: toIso(data.created_at), updated_at: toIso(data.updated_at) };
  });

  const upcomingBookingsRaw = allBookings
    .filter((b: any) => b.event_date >= today)
    .sort((a: any, b: any) => (a.event_date > b.event_date ? 1 : -1))
    .slice(0, 5);

  const followUpsRaw = allEnquiries
    .filter((e: any) => e.follow_up_date && e.follow_up_date <= today && !["completed", "cancelled"].includes(e.status))
    .sort((a: any, b: any) => (a.follow_up_date > b.follow_up_date ? 1 : -1))
    .slice(0, 10);

  const clientIds = Array.from(new Set([...myEnquiries, ...followUpsRaw].map((e: any) => e.client_id).filter(Boolean))) as string[];
  const artistIds = Array.from(new Set(upcomingBookingsRaw.map((b: any) => b.artist_id).filter(Boolean))) as string[];

  const [clientDocs, artistProfileDocs, artistUserDocs, taskSnaps] = await Promise.all([
    Promise.all(clientIds.map((id: string) => adminDb.collection("users").doc(id).get())),
    Promise.all(artistIds.map((id: string) => adminDb.collection("artistProfiles").doc(id).get())),
    Promise.all(artistIds.map((id: string) => adminDb.collection("users").doc(id).get())),
    Promise.all(allBookings.map((b: any) => adminDb.collection("bookings").doc(b.id).collection("tasks").where("status", "==", "pending").get())),
  ]);

  const clientsById = Object.fromEntries(clientDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
  const artistProfilesById = Object.fromEntries(artistProfileDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
  const artistUsersById = Object.fromEntries(artistUserDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const enrichedEnquiries = myEnquiries.map((e: any) => ({
    ...e,
    client: e.client_id ? clientsById[e.client_id] ?? null : null,
  }));

  const enrichedFollowUps = followUpsRaw.map((e: any) => ({
    ...e,
    created_at: toIso(e.created_at),
    updated_at: toIso(e.updated_at),
    client: e.client_id ? clientsById[e.client_id] ?? null : null,
  }));

  const enrichedUpcomingBookings = upcomingBookingsRaw.map((b: any) => {
    const profile = artistProfilesById[b.artist_id];
    return {
      ...b,
      artist: profile ? { ...profile, id: b.artist_id, user: artistUsersById[b.artist_id] ?? null } : undefined,
    };
  });

  const pendingTasks = allBookings
    .flatMap((b: any, i: number) =>
      taskSnaps[i].docs.map((t) => ({
        id: t.id,
        booking_id: b.id,
        ...t.data(),
        booking: { event_date: b.event_date, venue: b.venue, city: b.city },
      }))
    )
    .sort((a: any, b: any) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
    .slice(0, 10);

  return (
    <DashboardLayout user={serialize(user)} title="My Dashboard">
      <CoordinatorOverview
        enquiries={serialize(enrichedEnquiries) as any}
        upcomingBookings={serialize(enrichedUpcomingBookings) as any}
        pendingTasks={serialize(pendingTasks) as any}
        followUpEnquiries={serialize(enrichedFollowUps) as any}
        performance={performance}
      />
    </DashboardLayout>
  );
}
