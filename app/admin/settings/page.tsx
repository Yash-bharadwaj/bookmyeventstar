import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/server";
import { adminDb } from "@/lib/firebase/admin";
import { serialize } from "@/lib/firebase/firestore-utils";
import { AdminSettingsClient } from "./AdminSettingsClient";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/login");

  const [categoriesSnap, citiesSnap, settingsSnap] = await Promise.all([
    adminDb.collection("categories").orderBy("name").get(),
    adminDb.collection("cities").orderBy("name").get(),
    adminDb.getAll(
      adminDb.collection("settings").doc("artist_share_pct"),
      adminDb.collection("settings").doc("coordinator_workload_max"),
      adminDb.collection("settings").doc("advance_payment_pct")
    ),
  ]);

  const categories = categoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const cities = citiesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const [artistShareDoc, workloadMaxDoc, advancePctDoc] = settingsSnap;
  const platformSettings = {
    artist_share_pct: Number(artistShareDoc.exists ? artistShareDoc.data()?.value : 70) || 70,
    coordinator_workload_max: Number(workloadMaxDoc.exists ? workloadMaxDoc.data()?.value : 8) || 8,
    advance_payment_pct: Number(advancePctDoc.exists ? advancePctDoc.data()?.value : 30) || 30,
  };

  return (
    <AdminSettingsClient
      categories={serialize(categories) as any}
      cities={serialize(cities) as any}
      platformSettings={platformSettings}
    />
  );
}
