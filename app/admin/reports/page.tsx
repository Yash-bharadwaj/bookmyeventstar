import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminReportsClient } from "./AdminReportsClient";

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/login");

  const [{ data: enquiries }, { data: bookings }, { data: payments }, { data: coordinatorEnquiries }] = await Promise.all([
    supabase.from("enquiries").select("status,source,created_at,city"),
    supabase.from("bookings").select("status,event_date,total_amount,city"),
    supabase.from("payments").select("type,amount,status,paid_at"),
    supabase.from("enquiries").select("coordinator_id, status, coordinator:users!enquiries_coordinator_id_fkey(name)"),
  ]);

  // Build per-coordinator performance
  const coordMap = new Map<string, { name: string; total: number; completed: number; confirmed: number; conversion: number }>();
  for (const e of (coordinatorEnquiries ?? [])) {
    const cid = e.coordinator_id;
    if (!cid) continue;
    const rawCoord: any = e.coordinator;
    const cname = Array.isArray(rawCoord) ? rawCoord[0]?.name ?? "Unknown" : rawCoord?.name ?? "Unknown";
    if (!coordMap.has(cid)) coordMap.set(cid, { name: cname, total: 0, completed: 0, confirmed: 0, conversion: 0 });
    const entry = coordMap.get(cid)!;
    entry.total++;
    if (e.status === "completed") entry.completed++;
    if (["confirmed", "in_progress", "completed"].includes(e.status)) entry.confirmed++;
  }
  const coordinatorStats = Array.from(coordMap.values()).map((c) => ({
    ...c,
    conversion: c.total ? Math.round((c.completed / c.total) * 100) : 0,
  })).sort((a, b) => b.total - a.total);

  return (
    <DashboardLayout user={profile} title="Reports & Analytics">
      <AdminReportsClient
        enquiries={enquiries ?? []}
        bookings={bookings ?? []}
        payments={payments ?? []}
        coordinatorStats={coordinatorStats}
      />
    </DashboardLayout>
  );
}
