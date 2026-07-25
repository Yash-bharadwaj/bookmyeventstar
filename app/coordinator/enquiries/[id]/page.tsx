import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { adminDb } from "@/lib/firebase/admin";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CoordinatorEnquiryDetail } from "./CoordinatorEnquiryDetail";

function toIso(v: any) {
  return v && typeof v.toDate === "function" ? v.toDate().toISOString() : v;
}

export default async function CoordinatorEnquiryDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coordinator") redirect("/login");

  const enquirySnap = await adminDb.collection("enquiries").doc(params.id).get();
  if (!enquirySnap.exists) notFound();
  const data: any = enquirySnap.data();
  if (data.coordinator_id !== user.id) notFound();

  const [clientSnap, coordinatorSnap, proposalsSnap] = await Promise.all([
    data.client_id ? adminDb.collection("users").doc(data.client_id).get() : Promise.resolve(null),
    data.coordinator_id ? adminDb.collection("users").doc(data.coordinator_id).get() : Promise.resolve(null),
    adminDb.collection("proposals").where("enquiry_id", "==", params.id).orderBy("created_at", "desc").get(),
  ]);

  const proposals = proposalsSnap.docs.map((d) => {
    const p = d.data();
    return { id: d.id, ...p, created_at: toIso(p.created_at), updated_at: toIso(p.updated_at) };
  });

  const enquiry = {
    id: enquirySnap.id,
    ...data,
    created_at: toIso(data.created_at),
    updated_at: toIso(data.updated_at),
    client: clientSnap && clientSnap.exists ? { id: clientSnap.id, ...clientSnap.data() } : null,
    coordinator: coordinatorSnap && coordinatorSnap.exists ? { id: coordinatorSnap.id, ...coordinatorSnap.data() } : null,
  };

  return (
    <DashboardLayout user={serialize(user)} title="Enquiry Details">
      <CoordinatorEnquiryDetail enquiry={serialize(enquiry) as any} proposals={serialize(proposals) as any} coordinatorId={user.id} />
    </DashboardLayout>
  );
}
