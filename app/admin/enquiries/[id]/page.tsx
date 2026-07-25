import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize, type AnyDoc } from "@/lib/firebase/firestore-utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminEnquiryDetail } from "./AdminEnquiryDetail";

export default async function AdminEnquiryDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/login");

  const [enquirySnap, proposalsSnap, coordinatorsSnap] = await Promise.all([
    adminDb.collection("enquiries").doc(params.id).get(),
    adminDb.collection("proposals").where("enquiry_id", "==", params.id).orderBy("created_at", "desc").get(),
    adminDb.collection("users").where("role", "==", "coordinator").where("is_active", "==", true).get(),
  ]);

  if (!enquirySnap.exists) notFound();

  const rawEnquiry = { id: enquirySnap.id, ...enquirySnap.data() } as AnyDoc;
  const [clientDoc, coordinatorDoc] = await Promise.all([
    rawEnquiry.client_id ? adminDb.collection("users").doc(rawEnquiry.client_id as string).get() : null,
    rawEnquiry.coordinator_id ? adminDb.collection("users").doc(rawEnquiry.coordinator_id as string).get() : null,
  ]);

  const enquiry = {
    ...rawEnquiry,
    client: clientDoc?.exists ? clientDoc.data() : undefined,
    coordinator: coordinatorDoc?.exists ? coordinatorDoc.data() : undefined,
  };

  const proposals = proposalsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const coordinators = coordinatorsSnap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, name: data.name, email: data.email };
  });

  return (
    <DashboardLayout user={serialize(user)} title="Enquiry Detail">
      <AdminEnquiryDetail
        enquiry={serialize(enquiry)}
        proposals={serialize(proposals)}
        coordinators={coordinators}
      />
    </DashboardLayout>
  );
}
