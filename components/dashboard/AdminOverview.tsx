"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Users,
  Music,
  CheckCircle,
  AlertCircle,
  UserCog,
  UserPlus,
  Mic2 as Mic2Icon,
  BarChart3,
  Settings2,
} from "lucide-react";
import { StatCard } from "./StatCard";
import { EnquiryTable } from "./EnquiryTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Enquiry } from "@/types";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface CoordinatorOption { id: string; name: string; email: string; }

interface AdminOverviewProps {
  stats: {
    total_enquiries: number;
    active_bookings: number;
    artists_count: number;
    coordinators_count: number;
  };
  recentEnquiries: Enquiry[];
  coordinators: CoordinatorOption[];
}

const PIPELINE_STAGES = [
  { key: "new", label: "New", icon: AlertCircle, color: "text-blue-500" },
  { key: "assigned", label: "Assigned", icon: UserCog, color: "text-purple-500" },
  { key: "proposal_sent", label: "Proposal Sent", icon: FileText, color: "text-cyan-500" },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle, color: "text-green-500" },
];

export function AdminOverview({ stats, recentEnquiries, coordinators }: AdminOverviewProps) {
  const router = useRouter();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [selectedCoordinator, setSelectedCoordinator] = useState("");
  const [assigning, setAssigning] = useState(false);

  const pipelineCounts = PIPELINE_STAGES.map((s) => ({
    ...s,
    count: recentEnquiries.filter((e) => e.status === s.key).length,
  }));

  const handleAssign = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setAssignDialogOpen(true);
  };

  const confirmAssign = async () => {
    if (!selectedEnquiry || !selectedCoordinator) return;
    setAssigning(true);
    try {
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
        link: `/coordinator/enquiries/${selectedEnquiry.id}`,
      });

      toast.success("Coordinator assigned successfully!");
      setAssignDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to assign coordinator");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Enquiries"
          value={stats.total_enquiries}
          icon={FileText}
          color="gold"
          trend={{ value: 12, label: "vs last month" }}
          index={0}
        />
        <StatCard
          title="Active Bookings"
          value={stats.active_bookings}
          icon={CheckCircle}
          color="green"
          trend={{ value: 8, label: "vs last month" }}
          index={1}
        />
        <StatCard
          title="Artists Listed"
          value={stats.artists_count}
          icon={Music}
          color="purple"
          index={2}
        />
        <StatCard
          title="Coordinators"
          value={stats.coordinators_count}
          icon={Users}
          color="blue"
          index={3}
        />
      </div>

      {/* Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Enquiry Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {pipelineCounts.map((stage, i) => {
              const Icon = stage.icon;
              return (
                <motion.div
                  key={stage.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-4 rounded-xl border hover:border-gold-300 transition-colors"
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${stage.color}`} />
                  <p className="text-2xl font-display font-bold">{stage.count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stage.label}</p>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Add Coordinator", href: "/admin/coordinators", icon: UserPlus,   color: "text-violet-600 bg-violet-50" },
          { label: "Add Artist",      href: "/admin/artists",       icon: Mic2Icon,   color: "text-rose-600 bg-rose-50" },
          { label: "View Reports",    href: "/admin/reports",       icon: BarChart3,  color: "text-amber-600 bg-amber-50" },
          { label: "System Settings", href: "/admin/settings",      icon: Settings2,  color: "text-teal-600 bg-teal-50" },
        ].map((action) => {
          const Icon = action.icon;
          return (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto flex-col gap-2 py-4 hover:border-gold-400 transition-colors"
            onClick={() => router.push(action.href)}
          >
            <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
          );
        })}
      </div>

      {/* Recent Enquiries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Enquiries</CardTitle>
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/enquiries")}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <EnquiryTable
            enquiries={recentEnquiries}
            baseHref="/admin/enquiries"
            showCoordinator
            onAssign={handleAssign}
          />
        </CardContent>
      </Card>

      {/* Assign Dialog */}
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
                <p><strong>Client:</strong> {selectedEnquiry.client?.name}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Coordinator</label>
                <Select onValueChange={setSelectedCoordinator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a coordinator" />
                  </SelectTrigger>
                  <SelectContent>
                    {coordinators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                <Button onClick={confirmAssign} loading={assigning} disabled={!selectedCoordinator}>
                  Assign
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
