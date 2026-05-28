import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminOverview } from "@/components/dashboard/AdminOverview";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/login");

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const [
    { count: totalEnquiries },
    { count: activeBookings },
    { data: recentEnquiries },
    { data: coordinators },
    { count: artistsCount },
    { count: newCount },
    { count: assignedCount },
    { count: proposalCount },
    { count: confirmedCount },
    { count: thisMonthEnquiries },
    { count: lastMonthEnquiries },
    { count: thisMonthBookings },
    { count: lastMonthBookings },
  ] = await Promise.all([
    supabase.from("enquiries").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }).in("status", ["confirmed", "in_progress"]),
    supabase.from("enquiries")
      .select("*, client:users!enquiries_client_id_fkey(name,email,phone), coordinator:users!enquiries_coordinator_id_fkey(name)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("users").select("id,name,email,phone,is_active").eq("role", "coordinator"),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "artist"),
    supabase.from("enquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("enquiries").select("*", { count: "exact", head: true }).eq("status", "assigned"),
    supabase.from("enquiries").select("*", { count: "exact", head: true }).eq("status", "proposal_sent"),
    supabase.from("enquiries").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
    supabase.from("enquiries").select("*", { count: "exact", head: true }).gte("created_at", thisMonthStart),
    supabase.from("enquiries").select("*", { count: "exact", head: true }).gte("created_at", lastMonthStart).lt("created_at", thisMonthStart),
    supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", thisMonthStart).in("status", ["confirmed", "in_progress"]),
    supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", lastMonthStart).lt("created_at", thisMonthStart).in("status", ["confirmed", "in_progress"]),
  ]);

  const enqTrend = lastMonthEnquiries && lastMonthEnquiries > 0
    ? Math.round(((thisMonthEnquiries ?? 0) - lastMonthEnquiries) / lastMonthEnquiries * 100)
    : null;
  const bkTrend = lastMonthBookings && lastMonthBookings > 0
    ? Math.round(((thisMonthBookings ?? 0) - lastMonthBookings) / lastMonthBookings * 100)
    : null;

  return (
    <DashboardLayout user={profile} title="Admin Dashboard">
      <AdminOverview
        stats={{
          total_enquiries: totalEnquiries ?? 0,
          active_bookings: activeBookings ?? 0,
          artists_count: artistsCount ?? 0,
          coordinators_count: coordinators?.length ?? 0,
          enq_trend: enqTrend,
          bk_trend: bkTrend,
        }}
        pipelineCounts={{
          new: newCount ?? 0,
          assigned: assignedCount ?? 0,
          proposal_sent: proposalCount ?? 0,
          confirmed: confirmedCount ?? 0,
        }}
        recentEnquiries={recentEnquiries ?? []}
        coordinators={coordinators ?? []}
      />
    </DashboardLayout>
  );
}
