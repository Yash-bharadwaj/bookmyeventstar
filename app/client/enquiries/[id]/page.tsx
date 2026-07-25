import { redirect, notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { getCurrentUser } from "@/lib/firebase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientEnquiryDetail } from "./ClientEnquiryDetail";

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

export default async function ClientEnquiryDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "client") redirect("/login");

  const enquiryDoc = await adminDb.collection("enquiries").doc(params.id).get();
  if (!enquiryDoc.exists) notFound();
  const enquiryData = toPlain(enquiryDoc.data()!) as any;
  if (enquiryData.client_id !== user.id) notFound();

  let coordinator = null;
  if (enquiryData.coordinator_id) {
    const coordDoc = await adminDb.collection("users").doc(enquiryData.coordinator_id).get();
    if (coordDoc.exists) {
      const c = coordDoc.data()!;
      coordinator = { id: coordDoc.id, name: c.name, email: c.email, phone: c.phone };
    }
  }

  // where(enquiry_id ==) + orderBy(created_at) needs a composite index in this
  // project (confirmed via a live-Firestore QA script) — fetch without the
  // orderBy and sort in JS instead of requiring that index to be deployed.
  const proposalsSnap = await adminDb.collection("proposals").where("enquiry_id", "==", params.id).get();
  const proposals = proposalsSnap.docs
    .map((d) => {
      const data = toPlain(d.data()) as any;
      return {
        id: d.id,
        status: data.status,
        quoted_price: data.quoted_price,
        validity_date: data.validity_date,
        created_at: data.created_at,
        content: data.content,
        artists_proposed: data.artists_proposed,
      };
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const e = { id: enquiryDoc.id, ...enquiryData, coordinator };

  return (
    <DashboardLayout user={serialize(user)} title="Enquiry Details">
      <ClientEnquiryDetail enquiry={e} proposals={proposals} />
    </DashboardLayout>
  );
}
