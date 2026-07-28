import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize, type AnyDoc } from "@/lib/firebase/firestore-utils";
import { ArtistLeadsClient } from "./ArtistLeadsClient";

export default async function ArtistLeadsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "artist") redirect("/login");

  const snap = await adminDb
    .collection("artistLeads")
    .where("artist_id", "==", user.id)
    .orderBy("created_at", "desc")
    .get();
  const leads = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AnyDoc);

  return (
    <ArtistLeadsClient
      leads={serialize(leads) as any}
      artistName={user.name}
      artistPhone={user.phone}
      artistEmail={user.email}
    />
  );
}
