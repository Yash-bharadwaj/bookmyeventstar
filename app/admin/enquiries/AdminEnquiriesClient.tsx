"use client";

import { useState } from "react";
import { EnquiryTable } from "@/components/dashboard/EnquiryTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Enquiry } from "@/types";

interface CoordinatorOption { id: string; name: string; email: string; }
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Props {
  enquiries: Enquiry[];
  coordinators: CoordinatorOption[];
}

const STATUSES = ["all", "new", "assigned", "proposal_sent", "confirmed", "completed", "cancelled"];

export function AdminEnquiriesClient({ enquiries, coordinators }: Props) {
  const router = useRouter();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [selectedCoordinator, setSelectedCoordinator] = useState("");

  const handleAssign = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setAssignDialogOpen(true);
  };

  const confirmAssign = async () => {
    if (!selectedEnquiry || !selectedCoordinator) return;
    const supabase = createClient();
    await supabase
      .from("enquiries")
      .update({ coordinator_id: selectedCoordinator, status: "assigned" })
      .eq("id", selectedEnquiry.id);
    await supabase.from("notifications").insert({
      user_id: selectedCoordinator,
      title: "New Enquiry Assigned",
      message: `You have been assigned an enquiry for ${selectedEnquiry.event_type} in ${selectedEnquiry.city}.`,
      type: "info",
    });
    toast.success("Coordinator assigned!");
    setAssignDialogOpen(false);
    router.refresh();
  };

  return (
    <div className="p-4 md:p-6">
      <Tabs defaultValue="all">
        <div className="overflow-x-auto pb-2">
          <TabsList className="gap-1">
            {STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="capitalize text-xs">
                {s === "all" ? "All" : s.replace("_", " ")}
                <span className="ml-1.5 text-[10px] bg-background/60 rounded-full px-1.5">
                  {s === "all"
                    ? enquiries.length
                    : enquiries.filter((e) => e.status === s).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {STATUSES.map((s) => (
          <TabsContent key={s} value={s} className="mt-6">
            <EnquiryTable
              enquiries={s === "all" ? enquiries : enquiries.filter((e) => e.status === s)}
              baseHref="/admin/enquiries"
              showCoordinator
              onAssign={handleAssign}
            />
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Coordinator</DialogTitle>
          </DialogHeader>
          {selectedEnquiry && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 text-sm space-y-1">
                <p><strong>Event:</strong> {selectedEnquiry.event_type}</p>
                <p><strong>Date:</strong> {formatDate(selectedEnquiry.event_date)}</p>
                <p><strong>City:</strong> {selectedEnquiry.city}</p>
              </div>
              <Select onValueChange={setSelectedCoordinator}>
                <SelectTrigger><SelectValue placeholder="Choose coordinator" /></SelectTrigger>
                <SelectContent>
                  {coordinators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                <Button onClick={confirmAssign} disabled={!selectedCoordinator}>Assign</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
