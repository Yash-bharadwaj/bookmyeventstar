import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { getCurrentUser } from "@/lib/firebase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientProposalsClient } from "./ClientProposalsClient";

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

export default async function ClientProposalsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "client") redirect("/login");

  const enquiriesSnap = await adminDb.collection("enquiries").where("client_id", "==", user.id).get();
  const enquiriesById = Object.fromEntries(enquiriesSnap.docs.map((d) => [d.id, d.data()]));
  const enquiryIds = enquiriesSnap.docs.map((d) => d.id);

  let proposalDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  if (enquiryIds.length > 0) {
    const proposalSnaps = await Promise.all(
      chunk(enquiryIds, 30).map((ids) => adminDb.collection("proposals").where("enquiry_id", "in", ids).get())
    );
    proposalDocs = proposalSnaps.flatMap((snap) => snap.docs);
  }

  const proposals = proposalDocs
    .map((d) => {
      const data = toPlain(d.data()) as any;
      const enq = enquiriesById[data.enquiry_id] as any;
      return {
        id: d.id,
        ...data,
        enquiry: enq
          ? {
              event_type: enq.event_type,
              event_date: enq.event_date,
              city: enq.city,
              location: enq.location,
              other_requirements: enq.other_requirements,
            }
          : null,
      };
    })
    .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <DashboardLayout user={serialize(user)} title="My Proposals">
      <ClientProposalsClient proposals={proposals as any} clientId={user.id} />
    </DashboardLayout>
  );
}
