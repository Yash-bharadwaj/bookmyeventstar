import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArtistDocumentsClient } from "./ArtistDocumentsClient";

export default async function ArtistDocumentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "artist") redirect("/login");

  const { data: artistProfile } = await supabase
    .from("artist_profiles").select("id").eq("user_id", user.id).single();

  const { data: documents } = await supabase
    .from("artist_documents")
    .select("*")
    .eq("artist_id", artistProfile?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout user={profile} title="My Documents">
      <ArtistDocumentsClient artistProfileId={artistProfile?.id ?? ""} documents={documents ?? []} />
    </DashboardLayout>
  );
}
