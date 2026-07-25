import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { adminDb } from "@/lib/firebase/admin";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CoordinatorCalendarClient } from "./CoordinatorCalendarClient";

export default async function CoordinatorCalendarPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "coordinator") redirect("/login");

  const bookingsSnap = await adminDb.collection("bookings").where("coordinator_id", "==", user.id).get();

  const bookingsRaw = bookingsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((b: any) => b.status !== "cancelled");

  const enquiryIds = Array.from(new Set(bookingsRaw.map((b: any) => b.enquiry_id).filter(Boolean))) as string[];
  const enquiryDocs = await Promise.all(enquiryIds.map((id: string) => adminDb.collection("enquiries").doc(id).get()));
  const enquiriesById = Object.fromEntries(enquiryDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const bookings = bookingsRaw.map((b: any) => ({
    id: b.id,
    event_date: b.event_date,
    venue: b.venue,
    city: b.city,
    status: b.status,
    total_amount: b.total_amount,
    enquiry: b.enquiry_id && enquiriesById[b.enquiry_id] ? { event_type: (enquiriesById[b.enquiry_id] as any).event_type } : null,
  }));

  return (
    <DashboardLayout user={serialize(user)} title="Event Calendar">
      <CoordinatorCalendarClient bookings={bookings} />
    </DashboardLayout>
  );
}
