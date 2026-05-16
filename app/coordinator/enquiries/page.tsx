import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EnquiryTable } from "@/components/dashboard/EnquiryTable";

export default async function CoordinatorEnquiriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "coordinator") redirect("/login");

  const { data: enquiries } = await supabase
    .from("enquiries")
    .select("*, client:users!enquiries_client_id_fkey(name,email,phone)")
    .eq("coordinator_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout user={profile} title="My Enquiries">
      <div className="p-4 md:p-6">
        <EnquiryTable enquiries={enquiries ?? []} baseHref="/coordinator/enquiries" />
      </div>
    </DashboardLayout>
  );
}
