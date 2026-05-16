import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminSettingsClient } from "./AdminSettingsClient";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/login");

  const [{ data: categories }, { data: cities }] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase.from("cities").select("*").order("name"),
  ]);

  return (
    <DashboardLayout user={profile} title="System Settings">
      <AdminSettingsClient categories={categories ?? []} cities={cities ?? []} />
    </DashboardLayout>
  );
}
