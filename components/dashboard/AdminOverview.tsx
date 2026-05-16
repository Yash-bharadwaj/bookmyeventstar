"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Users, Music, CheckCircle, AlertCircle, UserCog, UserPlus,
  Mic2 as Mic2Icon, BarChart3, Settings2, ArrowRight, Bell, ChevronRight,
  Clock, TrendingUp, Zap,
} from "lucide-react";
import { StatCard } from "./StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Enquiry } from "@/types";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CoordinatorOption { id: string; name: string; email: string; }

interface AdminOverviewProps {
  stats: {
    total_enquiries: number;
    active_bookings: number;
    artists_count: number;
    coordinators_count: number;
  };
  pipelineCounts: {
    new: number;
    assigned: number;
    proposal_sent: number;
    confirmed: number;
  };
  recentEnquiries: Enquiry[];
  coordinators: CoordinatorOption[];
}

const PIPELINE_STAGES = [
  { key: "new",           label: "New",           icon: AlertCircle, color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200",  dot: "bg-blue-500" },
  { key: "assigned",      label: "Assigned",      icon: UserCog,     color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500" },
  { key: "proposal_sent", label: "Proposal Sent", icon: FileText,    color: "text-cyan-600",   bg: "bg-cyan-50",   border: "border-cyan-200",   dot: "bg-cyan-500" },
  { key: "confirmed",     label: "Confirmed",     icon: CheckCircle, color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200",  dot: "bg-green-500" },
];

const QUICK_ACTIONS = [
  { label: "Add Coordinator", desc: "Invite a new coordinator", href: "/admin/coordinators", icon: UserPlus,  color: "text-violet-600", bg: "bg-violet-50" },
  { label: "View Reports",    desc: "Analytics & revenue",      href: "/admin/reports",      icon: BarChart3,  color: "text-amber-600",  bg: "bg-amber-50" },
  { label: "Manage Artists",  desc: "Verify & review artists",  href: "/admin/artists",      icon: Mic2Icon,   color: "text-rose-600",   bg: "bg-rose-50" },
  { label: "Settings",        desc: "Categories & cities",      href: "/admin/settings",     icon: Settings2,  color: "text-teal-600",   bg: "bg-teal-50" },
];

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminOverview({ stats, pipelineCounts: globalCounts, recentEnquiries, coordinators }: AdminOverviewProps) {
  const router = useRouter();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [selectedCoordinator, setSelectedCoordinator] = useState("");
  const [assigning, setAssigning] = useState(false);

  const pipelineCounts = PIPELINE_STAGES.map((s) => ({
    ...s,
    count: globalCounts[s.key as keyof typeof globalCounts] ?? 0,
  }));

  const newEnquiries = recentEnquiries.filter((e) => e.status === "new");
  const totalNew = globalCounts.new;

  const handleAssign = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setSelectedCoordinator("");
    setAssignDialogOpen(true);
  };

  const confirmAssign = async () => {
    if (!selectedEnquiry || !selectedCoordinator) return;
    setAssigning(true);
    try {
      const supabase = createClient();
      await supabase.from("enquiries")
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

      {/* Needs Attention Banner */}
      {totalNew > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {totalNew} new {totalNew === 1 ? "enquiry needs" : "enquiries need"} a coordinator assigned
            </p>
            <p className="text-indigo-200 text-xs mt-0.5">Assign now to keep clients happy</p>
          </div>
          <Link href="/admin/enquiries">
            <Button size="sm" className="bg-white text-indigo-700 hover:bg-indigo-50 flex-shrink-0">
              Assign Now <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Enquiries" value={stats.total_enquiries} icon={FileText}  color="indigo"  trend={{ value: 12, label: "vs last month" }} index={0} />
        <StatCard title="Active Bookings" value={stats.active_bookings} icon={CheckCircle} color="green"  trend={{ value: 8,  label: "vs last month" }} index={1} />
        <StatCard title="Artists Listed"  value={stats.artists_count}   icon={Music}      color="purple" index={2} />
        <StatCard title="Coordinators"    value={stats.coordinators_count} icon={Users}   color="blue"   index={3} />
      </div>

      {/* Pipeline - clickable */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />Enquiry Pipeline
          </h2>
          <Link href="/admin/enquiries" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {pipelineCounts.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <Link key={stage.key} href={`/admin/enquiries?status=${stage.key}`}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                  className={`p-4 rounded-2xl border ${stage.border} ${stage.bg} cursor-pointer transition-all group`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center shadow-sm`}>
                      <Icon className={`w-4 h-4 ${stage.color}`} />
                    </div>
                    {stage.key === "new" && stage.count > 0 && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </div>
                  <p className={`text-3xl font-display font-bold ${stage.color}`}>{stage.count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">{stage.label}</p>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href}>
                <motion.div
                  whileHover={{ y: -2 }}
                  className="p-4 rounded-2xl border hover:border-indigo-200 hover:bg-indigo-50/20 bg-card transition-all cursor-pointer group"
                >
                  <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${action.color}`} />
                  </div>
                  <p className="font-semibold text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Needs Immediate Action — Unassigned Enquiries */}
      {newEnquiries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Needs Assignment ({newEnquiries.length} shown)
            </h2>
            <Link href="/admin/enquiries" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {newEnquiries.slice(0, 5).map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 p-3 rounded-xl border border-red-100 bg-red-50/30 hover:bg-red-50/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{e.client?.name} — {e.event_type}</p>
                  <p className="text-xs text-muted-foreground">{e.city} · {formatDate(e.event_date)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />{timeAgo(e.created_at)}
                  </span>
                  <Button size="sm" className="h-7 text-xs" onClick={() => handleAssign(e)}>
                    Assign
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Recent Enquiries</h2>
          <Link href="/admin/enquiries" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="rounded-2xl border overflow-hidden">
          {recentEnquiries.slice(0, 8).map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-accent/20 transition-colors"
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                e.status === "new" ? "bg-red-500 animate-pulse" :
                e.status === "confirmed" ? "bg-green-500" :
                e.status === "proposal_sent" ? "bg-cyan-500" :
                "bg-purple-500"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{e.client?.name ?? "—"}</p>
                  <span className="text-xs text-muted-foreground">·</span>
                  <p className="text-xs text-muted-foreground truncate">{e.event_type}</p>
                </div>
                <p className="text-xs text-muted-foreground">{e.city} · {formatDate(e.event_date)}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(e.status)}`}>
                  {getStatusLabel(e.status)}
                </span>
                {!e.coordinator_id ? (
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2 border-indigo-300 text-indigo-600" onClick={() => handleAssign(e)}>
                    Assign
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground hidden sm:block">{e.coordinator?.name}</span>
                )}
                <Link href={`/admin/enquiries/${e.id}`}>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Coordinator</DialogTitle>
          </DialogHeader>
          {selectedEnquiry && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 text-sm space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-indigo-700">{selectedEnquiry.event_type}</span>
                  <span className="text-xs text-muted-foreground">—</span>
                  <span className="text-xs text-muted-foreground">{selectedEnquiry.city}</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Client: {selectedEnquiry.client?.name} · Date: {formatDate(selectedEnquiry.event_date)}
                </p>
                <p className="text-xs font-medium text-indigo-600">
                  Budget: {formatCurrency(selectedEnquiry.budget_min)} – {formatCurrency(selectedEnquiry.budget_max)}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Select Coordinator</label>
                <Select value={selectedCoordinator} onValueChange={setSelectedCoordinator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a coordinator..." />
                  </SelectTrigger>
                  <SelectContent>
                    {coordinators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                            {c.name[0]}
                          </div>
                          <span>{c.name}</span>
                          <span className="text-muted-foreground text-xs">· {c.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                <Button onClick={confirmAssign} loading={assigning} disabled={!selectedCoordinator}>
                  Assign Coordinator
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
