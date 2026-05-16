import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminArtistsClient } from "./AdminArtistsClient";

export default async function AdminArtistsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/login");

  const { data: artists } = await supabase
    .from("artist_profiles")
    .select("*, user:users(name,email,phone,is_active,avatar_url)")
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout user={profile} title="Artists">
      <AdminArtistsClient artists={artists ?? []} />
    </DashboardLayout>
  );
}
