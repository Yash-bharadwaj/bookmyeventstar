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

  const [{ data: enquiries }, { data: bookings }, { data: payments }] = await Promise.all([
    supabase.from("enquiries").select("status,source,created_at,city"),
    supabase.from("bookings").select("status,event_date,total_amount,city"),
    supabase.from("payments").select("type,amount,status,paid_at"),
  ]);

  return (
    <DashboardLayout user={profile} title="Reports & Analytics">
      <AdminReportsClient
        enquiries={enquiries ?? []}
        bookings={bookings ?? []}
        payments={payments ?? []}
      />
    </DashboardLayout>
  );
}
