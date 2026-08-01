import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { serialize } from "@/lib/firebase/firestore-utils";
import { adminDb } from "@/lib/firebase/admin";
import { ArtistSearchClient } from "./ArtistSearchClient";

export default async function CoordinatorArtistsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "coordinator") redirect("/login");

  const [artistsSnap, enquiriesSnap, categoriesSnap] = await Promise.all([
    adminDb
      .collection("artistProfiles")
      .where("is_verified", "==", true)
      .where("is_listed", "==", true)
      .orderBy("rating", "desc")
      .get(),
    adminDb.collection("enquiries").where("coordinator_id", "==", user.id).get(),
    adminDb.collection("categories").get(),
  ]);

  const artistsRaw = artistsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const artistIds = artistsRaw.map((a: any) => a.id);

  const [userDocs, mediaSnaps] = await Promise.all([
    Promise.all(artistIds.map((id: string) => adminDb.collection("users").doc(id).get())),
    Promise.all(artistIds.map((id: string) => adminDb.collection("artistProfiles").doc(id).collection("media").get())),
  ]);

  const usersById = Object.fromEntries(userDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const mappedArtists = artistsRaw.map((a: any, i: number) => ({
    ...a,
    area: a.area ?? null,
    user: usersById[a.id] ?? null,
    media: mediaSnaps[i].docs.map((m) => ({ id: m.id, ...m.data() })),
  }));

  const enquiriesRaw = enquiriesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((e: any) => ["assigned", "requirement_gathering", "shortlisting"].includes(e.status))
    .sort((a: any, b: any) => (a.event_date > b.event_date ? 1 : -1));

  const clientIds = Array.from(new Set(enquiriesRaw.map((e: any) => e.client_id).filter(Boolean))) as string[];
  const clientDocs = await Promise.all(clientIds.map((id: string) => adminDb.collection("users").doc(id).get()));
  const clientsById = Object.fromEntries(clientDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

  const mappedEnquiries = enquiriesRaw.map((e: any) => ({
    id: e.id,
    event_type: e.event_type,
    event_date: e.event_date,
    city: e.city,
    budget_min: e.budget_min,
    budget_max: e.budget_max,
    client: e.client_id && clientsById[e.client_id] ? { name: (clientsById[e.client_id] as any).name } : null,
  }));

  const categoryNames = categoriesSnap.docs.map((d) => d.data().name as string).sort();

  return (
    <ArtistSearchClient artists={serialize(mappedArtists) as any} enquiries={serialize(mappedEnquiries) as any} allCategories={categoryNames} />
  );
}
