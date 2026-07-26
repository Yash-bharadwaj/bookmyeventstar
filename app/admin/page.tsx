import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize, type AnyDoc } from "@/lib/firebase/firestore-utils";
import { AdminOverview } from "@/components/dashboard/AdminOverview";
import type { User } from "@/types";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/login");

  const now = new Date();
  const thisMonthStart = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastMonthStart = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const enquiriesCol = adminDb.collection("enquiries");
  const bookingsCol = adminDb.collection("bookings");

  const [
    totalEnquiriesSnap,
    activeBookingsSnap,
    recentEnquiriesSnap,
    coordinatorsSnap,
    artistsCountSnap,
    newCountSnap,
    assignedCountSnap,
    proposalCountSnap,
    confirmedCountSnap,
    thisMonthEnquiriesSnap,
    lastMonthEnquiriesSnap,
    thisMonthBookingsSnap,
    lastMonthBookingsSnap,
  ] = await Promise.all([
    enquiriesCol.count().get(),
    bookingsCol.where("status", "in", ["confirmed", "in_progress"]).count().get(),
    enquiriesCol.orderBy("created_at", "desc").limit(10).get(),
    adminDb.collection("users").where("role", "==", "coordinator").get(),
    adminDb.collection("users").where("role", "==", "artist").count().get(),
    enquiriesCol.where("status", "==", "new").count().get(),
    enquiriesCol.where("status", "==", "assigned").count().get(),
    enquiriesCol.where("status", "==", "proposal_sent").count().get(),
    enquiriesCol.where("status", "==", "confirmed").count().get(),
    enquiriesCol.where("created_at", ">=", thisMonthStart).count().get(),
    enquiriesCol.where("created_at", ">=", lastMonthStart).where("created_at", "<", thisMonthStart).count().get(),
    bookingsCol.where("status", "in", ["confirmed", "in_progress"]).where("created_at", ">=", thisMonthStart).count().get(),
    bookingsCol.where("status", "in", ["confirmed", "in_progress"]).where("created_at", ">=", lastMonthStart).where("created_at", "<", thisMonthStart).count().get(),
  ]);

  const totalEnquiries = totalEnquiriesSnap.data().count;
  const activeBookings = activeBookingsSnap.data().count;
  const artistsCount = artistsCountSnap.data().count;
  const newCount = newCountSnap.data().count;
  const assignedCount = assignedCountSnap.data().count;
  const proposalCount = proposalCountSnap.data().count;
  const confirmedCount = confirmedCountSnap.data().count;
  const thisMonthEnquiries = thisMonthEnquiriesSnap.data().count;
  const lastMonthEnquiries = lastMonthEnquiriesSnap.data().count;
  const thisMonthBookings = thisMonthBookingsSnap.data().count;
  const lastMonthBookings = lastMonthBookingsSnap.data().count;

  const coordinators = coordinatorsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Enrich recent enquiries with client/coordinator names — no joins in
  // Firestore, so fetch the referenced user docs in parallel and merge.
  const rawEnquiries = recentEnquiriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as AnyDoc);
  const userIds = Array.from(
    new Set(
      rawEnquiries.flatMap((e) => [e.client_id as string | null, e.coordinator_id as string | null]).filter((v): v is string => !!v)
    )
  );
  const userDocs = userIds.length
    ? await adminDb.getAll(...userIds.map((id) => adminDb.collection("users").doc(id)))
    : [];
  const userMap = new Map(userDocs.map((d, i) => [userIds[i], d.exists ? d.data() : null]));

  const recentEnquiries = rawEnquiries.map((e) => ({
    ...e,
    client: e.client_id ? userMap.get(e.client_id as string) ?? undefined : undefined,
    coordinator: e.coordinator_id ? userMap.get(e.coordinator_id as string) ?? undefined : undefined,
  }));

  const enqTrend = lastMonthEnquiries > 0
    ? Math.round(((thisMonthEnquiries - lastMonthEnquiries) / lastMonthEnquiries) * 100)
    : null;
  const bkTrend = lastMonthBookings > 0
    ? Math.round(((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100)
    : null;

  return (
    <AdminOverview
      stats={{
        total_enquiries: totalEnquiries,
        active_bookings: activeBookings,
        artists_count: artistsCount,
        coordinators_count: coordinators.length,
        enq_trend: enqTrend,
        bk_trend: bkTrend,
      }}
      pipelineCounts={{
        new: newCount,
        assigned: assignedCount,
        proposal_sent: proposalCount,
        confirmed: confirmedCount,
      }}
      recentEnquiries={serialize(recentEnquiries) as any}
      coordinators={serialize(coordinators) as User[]}
    />
  );
}
