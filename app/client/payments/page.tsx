import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { getCurrentUser } from "@/lib/firebase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientPaymentsClient } from "./ClientPaymentsClient";

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

export default async function ClientPaymentsPage() {
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

  const bookings = bookingDocs.map((d) => {
    const data = toPlain(d.data()) as any;
    const enq = enquiriesById[data.enquiry_id] as any;
    return {
      id: d.id,
      total_amount: data.total_amount,
      advance_amount: data.advance_amount,
      balance_amount: data.balance_amount,
      event_date: data.event_date,
      venue: data.venue,
      city: data.city,
      status: data.status,
      enquiry: enq ? { event_type: enq.event_type } : null,
    };
  });

  // payments live as a subcollection per booking now (bookings/{id}/payments/{paymentId})
  const paymentSnaps = await Promise.all(
    bookings.map((b) =>
      adminDb
        .collection("bookings")
        .doc(b.id)
        .collection("payments")
        .where("type", "in", ["advance", "final"])
        .get()
    )
  );
  const payments = bookings
    .flatMap((b, i) =>
      paymentSnaps[i].docs.map((d) => ({ id: d.id, booking_id: b.id, ...toPlain(d.data()) }))
    )
    .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <DashboardLayout user={serialize(user)} title="Payments & Invoices">
      <ClientPaymentsClient bookings={bookings} payments={payments as any} />
    </DashboardLayout>
  );
}
