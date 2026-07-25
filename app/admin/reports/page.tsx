import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminReportsClient } from "./AdminReportsClient";

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/login");

  const [enquiriesSnap, bookingsSnap, paymentsSnap, coordinatorEnquiriesSnap] = await Promise.all([
    adminDb.collection("enquiries").select("status", "source", "created_at", "city").get(),
    adminDb.collection("bookings").select("status", "event_date", "total_amount", "city").get(),
    // payments now live under bookings/{id}/payments — a collection-group
    // query reaches all of them across every booking in one shot.
    adminDb.collectionGroup("payments").select("type", "amount", "status", "paid_at").get(),
    adminDb.collection("enquiries").select("coordinator_id", "status").get(),
  ]);

  const enquiries = enquiriesSnap.docs.map((d) => d.data());
  const bookings = bookingsSnap.docs.map((d) => d.data());
  const payments = paymentsSnap.docs.map((d) => d.data());
  const coordinatorEnquiries = coordinatorEnquiriesSnap.docs.map((d) => d.data());

  // Build per-coordinator performance — fetch names for the referenced coordinators.
  const coordinatorIds = Array.from(
    new Set(coordinatorEnquiries.map((e) => e.coordinator_id as string | null).filter((v): v is string => !!v))
  );
  const coordinatorDocs = coordinatorIds.length
    ? await adminDb.getAll(...coordinatorIds.map((id) => adminDb.collection("users").doc(id)))
    : [];
  const coordinatorNameMap = new Map(
    coordinatorDocs.map((d, i) => [coordinatorIds[i], d.exists ? (d.data()?.name as string) ?? "Unknown" : "Unknown"])
  );

  const coordMap = new Map<string, { name: string; total: number; completed: number; confirmed: number; conversion: number }>();
  for (const e of coordinatorEnquiries) {
    const cid = e.coordinator_id as string | undefined;
    if (!cid) continue;
    const cname = coordinatorNameMap.get(cid) ?? "Unknown";
    if (!coordMap.has(cid)) coordMap.set(cid, { name: cname, total: 0, completed: 0, confirmed: 0, conversion: 0 });
    const entry = coordMap.get(cid)!;
    entry.total++;
    if (e.status === "completed") entry.completed++;
    if (["confirmed", "in_progress", "completed"].includes(e.status)) entry.confirmed++;
  }
  const coordinatorStats = Array.from(coordMap.values()).map((c) => ({
    ...c,
    conversion: c.total ? Math.round((c.completed / c.total) * 100) : 0,
  })).sort((a, b) => b.total - a.total);

  return (
    <DashboardLayout user={serialize(user)} title="Reports & Analytics">
      <AdminReportsClient
        enquiries={serialize(enquiries) as any}
        bookings={serialize(bookings) as any}
        payments={serialize(payments) as any}
        coordinatorStats={coordinatorStats}
      />
    </DashboardLayout>
  );
}
