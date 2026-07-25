import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { adminDb } from "@/lib/firebase/admin";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EnquiryTable } from "@/components/dashboard/EnquiryTable";

function toIso(v: any) {
  return v && typeof v.toDate === "function" ? v.toDate().toISOString() : v;
}

export default async function CoordinatorEnquiriesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "coordinator") redirect("/login");

  const snap = await adminDb
    .collection("enquiries")
    .where("coordinator_id", "==", user.id)
    .orderBy("created_at", "desc")
    .get();

  const enquiriesRaw = snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, created_at: toIso(data.created_at), updated_at: toIso(data.updated_at) };
  });

  const clientIds = Array.from(new Set(enquiriesRaw.map((e: any) => e.client_id).filter(Boolean))) as string[];
  const clientDocs = await Promise.all(clientIds.map((id: string) => adminDb.collection("users").doc(id).get()));
  const clientsById = Object.fromEntries(clientDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const enquiries = enquiriesRaw.map((e: any) => {
    const client: any = e.client_id ? clientsById[e.client_id] : null;
    return {
      ...e,
      client: client ? { name: client.name, email: client.email, phone: client.phone } : null,
    };
  });

  return (
    <DashboardLayout user={serialize(user)} title="My Enquiries">
      <div className="p-4 md:p-6">
        <EnquiryTable enquiries={enquiries as any} baseHref="/coordinator/enquiries" />
      </div>
    </DashboardLayout>
  );
}
