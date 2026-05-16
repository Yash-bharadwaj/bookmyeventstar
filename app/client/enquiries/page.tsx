import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EnquiryTable } from "@/components/dashboard/EnquiryTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function ClientEnquiriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "client") redirect("/login");

  const { data: enquiries } = await supabase
    .from("enquiries")
    .select("*, coordinator:users!enquiries_coordinator_id_fkey(name)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout user={profile} title="My Enquiries">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex justify-end">
          <Link href="/enquiry">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Enquiry
            </Button>
          </Link>
        </div>
        <EnquiryTable enquiries={enquiries ?? []} baseHref="/client/enquiries" />
      </div>
    </DashboardLayout>
  );
}
