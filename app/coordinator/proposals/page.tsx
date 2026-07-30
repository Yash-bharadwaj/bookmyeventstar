import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { adminDb } from "@/lib/firebase/admin";
import { CoordinatorProposalsClient } from "./CoordinatorProposalsClient";

function toIso(v: any) {
  return v && typeof v.toDate === "function" ? v.toDate().toISOString() : v;
}

export default async function CoordinatorProposalsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "coordinator") redirect("/login");

  const [proposalsSnap, enquiriesSnap, artistsSnap, citiesSnap] = await Promise.all([
    adminDb.collection("proposals").where("coordinator_id", "==", user.id).orderBy("created_at", "desc").get(),
    adminDb.collection("enquiries").where("coordinator_id", "==", user.id).get(),
    adminDb
      .collection("artistProfiles")
      .where("is_verified", "==", true)
      .where("is_listed", "==", true)
      .orderBy("rating", "desc")
      .get(),
    adminDb.collection("cities").orderBy("name").get(),
  ]);

  const proposalsRaw = proposalsSnap.docs.map((d) => {
    const p = d.data();
    return { id: d.id, ...p, created_at: toIso(p.created_at), updated_at: toIso(p.updated_at) };
  });

  const enquiryIdsForProposals = Array.from(new Set(proposalsRaw.map((p: any) => p.enquiry_id).filter(Boolean))) as string[];
  const enquiryDocsForProposals = await Promise.all(
    enquiryIdsForProposals.map((id: string) => adminDb.collection("enquiries").doc(id).get())
  );
  const enquiriesByIdForProposals = Object.fromEntries(
    enquiryDocsForProposals.filter((d) => d.exists).map((d) => [d.id, d.data()])
  );

  const proposalClientIds = Array.from(
    new Set(Object.values(enquiriesByIdForProposals).map((e: any) => e.client_id).filter(Boolean))
  ) as string[];
  const proposalClientDocs = await Promise.all(
    proposalClientIds.map((id: string) => adminDb.collection("users").doc(id).get())
  );
  const proposalClientsById = Object.fromEntries(
    proposalClientDocs.filter((d) => d.exists).map((d) => [d.id, d.data()])
  );

  const proposals = proposalsRaw.map((p: any) => {
    const enq: any = p.enquiry_id ? enquiriesByIdForProposals[p.enquiry_id] : null;
    const client: any = enq?.client_id ? proposalClientsById[enq.client_id] : null;
    return {
      ...p,
      enquiry: enq
        ? {
            event_type: enq.event_type,
            event_date: enq.event_date,
            city: enq.city,
            other_requirements: enq.other_requirements,
            client: client ? { name: client.name } : null,
          }
        : null,
    };
  });

  const enquiriesRaw = enquiriesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((e: any) => ["assigned", "requirement_gathering", "shortlisting"].includes(e.status))
    .sort((a: any, b: any) => (a.event_date > b.event_date ? 1 : -1));

  const enquiryClientIds = Array.from(new Set(enquiriesRaw.map((e: any) => e.client_id).filter(Boolean))) as string[];
  const enquiryClientDocs = await Promise.all(
    enquiryClientIds.map((id: string) => adminDb.collection("users").doc(id).get())
  );
  const enquiryClientsById = Object.fromEntries(
    enquiryClientDocs.filter((d) => d.exists).map((d) => [d.id, d.data()])
  );

  const enquiries = enquiriesRaw.map((e: any) => ({
    id: e.id,
    event_type: e.event_type,
    event_date: e.event_date,
    city: e.city,
    budget_min: e.budget_min,
    budget_max: e.budget_max,
    client: e.client_id && enquiryClientsById[e.client_id] ? { name: (enquiryClientsById[e.client_id] as any).name } : null,
  }));

  const artistsRaw = artistsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const artistUserDocs = await Promise.all(artistsRaw.map((a: any) => adminDb.collection("users").doc(a.id).get()));
  const artistUsersById = Object.fromEntries(artistUserDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const artists = artistsRaw.map((a: any) => {
    const artistUser: any = artistUsersById[a.id];
    return {
      id: a.id,
      categories: a.categories ?? [],
      cities: a.cities ?? [],
      base_price: a.base_price,
      rating: a.rating,
      total_bookings: a.total_bookings,
      user: artistUser ? { name: artistUser.name, phone: artistUser.phone } : null,
    };
  });

  const cityList: string[] = citiesSnap.docs.map((d) => d.data().name as string);

  return (
    <CoordinatorProposalsClient
      proposals={proposals as any}
      coordinatorId={user.id}
      enquiries={enquiries as any}
      artists={artists as any}
      cityList={cityList}
    />
  );
}
