import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { getCurrentUser } from "@/lib/firebase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientEnquiriesClient } from "./ClientEnquiriesClient";

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

export default async function ClientEnquiriesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "client") redirect("/login");

  // where(client_id ==) + orderBy(created_at) needs a composite index in this
  // project (confirmed via a live-Firestore QA script) — fetch without the
  // orderBy and sort in JS instead of requiring that index to be deployed.
  const enquiriesSnap = await adminDb.collection("enquiries").where("client_id", "==", user.id).get();
  const rawEnquiries = enquiriesSnap.docs
    .map((d) => ({ id: d.id, ...toPlain(d.data()) }) as any)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const coordinatorIds = Array.from(new Set(rawEnquiries.map((e) => e.coordinator_id).filter(Boolean))) as string[];
  const coordinatorDocs = await Promise.all(coordinatorIds.map((id) => adminDb.collection("users").doc(id).get()));
  const coordinatorsById = Object.fromEntries(coordinatorDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const enquiries = rawEnquiries.map((e) => ({
    ...e,
    coordinator: e.coordinator_id ? coordinatorsById[e.coordinator_id] ?? null : null,
  }));

  return (
    <DashboardLayout user={serialize(user)} title="My Enquiries">
      <ClientEnquiriesClient enquiries={serialize(enquiries) as any} />
    </DashboardLayout>
  );
}
