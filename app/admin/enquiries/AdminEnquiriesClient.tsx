"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, Clock, ChevronRight, Search, AlertCircle, UserCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Enquiry } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CoordinatorOption { id: string; name: string; email: string; }

interface Props {
  enquiries: Enquiry[];
  coordinators: CoordinatorOption[];
}

const STATUSES = ["all", "new", "assigned", "requirement_gathering", "shortlisting", "proposal_sent", "confirmed", "in_progress", "completed", "cancelled"];

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function urgencyLevel(date: string, status: string): "high" | "medium" | "low" {
  if (status !== "new") return "low";
  const hrs = (Date.now() - new Date(date).getTime()) / 3600000;
  if (hrs > 24) return "high";
  if (hrs > 6) return "medium";
  return "low";
}

export function AdminEnquiriesClient({ enquiries, coordinators }: Props) {
  const router = useRouter();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [selectedCoordinator, setSelectedCoordinator] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [search, setSearch] = useState("");
  // Bulk assign
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkAssignCoord, setBulkAssignCoord] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);

  const toggleBulkSelect = (id: string) =>
    setBulkSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const confirmBulkAssign = async () => {
    if (!bulkAssignCoord || bulkSelected.size === 0) return;
    setBulkAssigning(true);
    const supabase = createClient();
    const ids = Array.from(bulkSelected);
    await supabase.from("enquiries").update({ coordinator_id: bulkAssignCoord, status: "assigned" }).in("id", ids);
    const coord = coordinators.find((c) => c.id === bulkAssignCoord);
    await supabase.from("notifications").insert(
      ids.map((id) => {
        const enq = enquiries.find((e) => e.id === id);
        return { user_id: bulkAssignCoord, title: "Enquiry Assigned", message: `Assigned: ${enq?.event_type ?? "Event"} in ${enq?.city ?? ""}`, type: "info" };
      })
    );
    toast.success(`${ids.length} ${ids.length === 1 ? "enquiry" : "enquiries"} assigned to ${coord?.name ?? "coordinator"}`);
    setBulkSelected(new Set());
    setBulkAssignCoord("");
    setBulkAssigning(false);
    router.refresh();
  };

  const handleAssign = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setSelectedCoordinator(enquiry.coordinator_id ?? "");
    setAssignDialogOpen(true);
  };

  const confirmAssign = async () => {
    if (!selectedEnquiry || !selectedCoordinator) return;
    setAssigning(true);
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
    toast.success("Coordinator assigned!");
    setAssigning(false);
    setAssignDialogOpen(false);
    router.refresh();
  };

  const filterBySearch = (list: Enquiry[]) =>
    list.filter((e) =>
      !search ||
      (e.client?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      e.event_type.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase())
    );

  const EnquiryRow = ({ e }: { e: Enquiry }) => {
    const urgency = urgencyLevel(e.created_at, e.status);
    const isSelected = bulkSelected.has(e.id);
    return (
      <motion.div
        key={e.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-3 p-3 border-b last:border-0 hover:bg-accent/20 transition-colors ${
          isSelected ? "bg-indigo-50/60" :
          urgency === "high" ? "bg-red-50/40" :
          urgency === "medium" ? "bg-amber-50/30" : ""
        }`}
      >
        {/* Bulk select checkbox (only for new/unassigned) */}
        {e.status === "new" && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleBulkSelect(e.id)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 flex-shrink-0 cursor-pointer"
          />
        )}
        {/* Urgency indicator */}
        <div className="flex-shrink-0">
          {urgency === "high" ? (
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          ) : urgency === "medium" ? (
            <div className="w-2 h-2 rounded-full bg-amber-500" />
          ) : (
            <div className={`w-2 h-2 rounded-full ${
              e.status === "confirmed" ? "bg-green-500" :
              e.status === "completed" ? "bg-emerald-400" :
              e.status === "cancelled" ? "bg-gray-300" :
              "bg-indigo-400"
            }`} />
          )}
        </div>

        {/* Client + event */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{e.client?.name ?? "—"}</p>
            <span className="text-muted-foreground text-xs hidden sm:inline">·</span>
            <p className="text-xs text-muted-foreground hidden sm:block truncate">{e.event_type}</p>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <span>{e.city}</span>
            <span>·</span>
            <span>{formatDate(e.event_date)}</span>
            <span>·</span>
            <span className="font-medium">{formatCurrency(e.budget_min)}–{formatCurrency(e.budget_max)}</span>
          </div>
        </div>

        {/* Status */}
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 hidden md:inline-flex ${getStatusColor(e.status)}`}>
          {getStatusLabel(e.status)}
        </span>

        {/* Time ago */}
        <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0 hidden sm:flex">
          <Clock className="w-3 h-3" />{timeAgo(e.created_at)}
        </span>

        {/* Coordinator or assign */}
        <div className="flex-shrink-0">
          {e.coordinator?.name ? (
            <span className="text-xs text-muted-foreground hidden lg:block">{e.coordinator.name}</span>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => handleAssign(e)}
            >
              <UserCheck className="w-3.5 h-3.5 mr-1" />Assign
            </Button>
          )}
        </div>

        {/* View */}
        <Link href={`/admin/enquiries/${e.id}`} className="flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by client, event, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Bulk action bar */}
      {bulkSelected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200">
          <span className="text-sm font-medium text-indigo-800">{bulkSelected.size} enquir{bulkSelected.size === 1 ? "y" : "ies"} selected</span>
          <select
            value={bulkAssignCoord}
            onChange={(e) => setBulkAssignCoord(e.target.value)}
            className="flex-1 max-w-xs h-8 rounded-lg border border-indigo-200 text-sm px-2 bg-white text-indigo-900"
          >
            <option value="">Select coordinator…</option>
            {coordinators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button
            size="sm"
            disabled={!bulkAssignCoord || bulkAssigning}
            onClick={confirmBulkAssign}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {bulkAssigning ? "Assigning…" : "Assign All"}
          </Button>
          <button onClick={() => setBulkSelected(new Set())} className="text-xs text-indigo-500 hover:text-indigo-700 underline">
            Clear
          </button>
        </div>
      )}

      <Tabs defaultValue="all">
        <div className="overflow-x-auto pb-1">
          <TabsList className="gap-0.5 h-auto flex-wrap">
            {STATUSES.map((s) => {
              const count = s === "all" ? enquiries.length : enquiries.filter((e) => e.status === s).length;
              const isNew = s === "new";
              const newCount = enquiries.filter((e) => e.status === "new").length;
              return (
                <TabsTrigger key={s} value={s} className="capitalize text-xs relative">
                  {s === "all" ? "All" : getStatusLabel(s)}
                  <span className={`ml-1.5 text-[10px] rounded-full px-1.5 py-0 ${
                    isNew && count > 0 ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {count}
                  </span>
                  {isNew && count > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {STATUSES.map((s) => {
          const list = filterBySearch(s === "all" ? enquiries : enquiries.filter((e) => e.status === s));
          return (
            <TabsContent key={s} value={s} className="mt-4">
              {s === "new" && list.length > 0 && (
                <div className="mb-3 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">{list.length} new {list.length === 1 ? "enquiry needs" : "enquiries need"} coordinator assignment</span>
                </div>
              )}
              <div className="rounded-2xl border overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-1 px-3 py-2 border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:flex items-center gap-3">
                  <div className="w-2 flex-shrink-0" />
                  <div className="flex-1">Client & Event</div>
                  <div className="w-28">Status</div>
                  <div className="w-20">Time</div>
                  <div className="w-28">Coordinator</div>
                  <div className="w-7" />
                </div>
                {list.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    {search ? "No enquiries match your search" : "No enquiries in this status"}
                  </div>
                ) : (
                  list.map((e) => <EnquiryRow key={e.id} e={e} />)
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Coordinator</DialogTitle>
          </DialogHeader>
          {selectedEnquiry && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 space-y-1.5 text-sm">
                <p className="font-semibold text-indigo-700">{selectedEnquiry.event_type} — {selectedEnquiry.city}</p>
                <p className="text-muted-foreground text-xs">
                  Client: <span className="font-medium text-foreground">{selectedEnquiry.client?.name}</span>
                  {" · "}Date: {formatDate(selectedEnquiry.event_date)}
                </p>
                <p className="text-xs text-indigo-600 font-medium">
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
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
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
                  <UserCheck className="w-4 h-4 mr-2" />Assign Coordinator
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
