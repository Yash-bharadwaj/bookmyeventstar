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
  ]);

  return (
    <DashboardLayout user={profile} title="Admin Dashboard">
      <AdminOverview
        stats={{
          total_enquiries: totalEnquiries ?? 0,
          active_bookings: activeBookings ?? 0,
          artists_count: artistsCount ?? 0,
          coordinators_count: coordinators?.length ?? 0,
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
