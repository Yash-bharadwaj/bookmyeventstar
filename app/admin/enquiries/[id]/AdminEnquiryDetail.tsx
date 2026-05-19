"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, MapPin, IndianRupee, User, Phone, Mail,
  FileText, Clock, CheckCircle, Send, ClipboardList, UserCheck, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Coordinator { id: string; name: string; email: string; }

interface Props {
  enquiry: any;
  proposals: any[];
  coordinators: Coordinator[];
}

const STATUS_FLOW = [
  { key: "new", label: "New" },
  { key: "assigned", label: "Assigned" },
  { key: "requirement_gathering", label: "Gathering Requirements" },
  { key: "shortlisting", label: "Shortlisting Artists" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "confirmed", label: "Confirmed" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

export function AdminEnquiryDetail({ enquiry, proposals, coordinators }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(enquiry.other_requirements ?? "");
  const [status, setStatus] = useState(enquiry.status);
  const [coordinatorId, setCoordinatorId] = useState(enquiry.coordinator_id ?? "");
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const currentStepIndex = STATUS_FLOW.findIndex((s) => s.key === status);

  const saveUpdate = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("enquiries")
      .update({ status, other_requirements: notes })
      .eq("id", enquiry.id);
    if (error) toast.error("Failed to save");
    else toast.success("Enquiry updated!");
    setSaving(false);
    router.refresh();
  };

  const reassignCoordinator = async () => {
    if (!coordinatorId) return;
    setAssigning(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("enquiries")
      .update({ coordinator_id: coordinatorId, status: status === "new" ? "assigned" : status })
      .eq("id", enquiry.id);
    if (!error) {
      await supabase.from("notifications").insert({
        user_id: coordinatorId,
        title: "Enquiry Assigned",
        message: `You have been assigned the enquiry for ${enquiry.event_type} in ${enquiry.city}.`,
        type: "info",
        link: `/coordinator/enquiries/${enquiry.id}`,
      });
      toast.success("Coordinator assigned!");
      if (status === "new") setStatus("assigned");
    } else {
      toast.error("Failed to assign coordinator");
    }
    setAssigning(false);
    router.refresh();
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/admin/enquiries">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />Back to Enquiries
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{enquiry.event_type}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enquiry #{enquiry.id.slice(0, 8).toUpperCase()} · Submitted {formatDate(enquiry.created_at)}
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(enquiry.status)}`}>
          {getStatusLabel(enquiry.status)}
        </span>
      </div>

      {/* Progress Timeline */}
      <div className="rounded-2xl border p-5">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />Pipeline Progress
        </h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STATUS_FLOW.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < currentStepIndex ? "bg-indigo-500 text-white" :
                  i === currentStepIndex ? "bg-indigo-600 text-white ring-4 ring-indigo-100" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i < currentStepIndex ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="text-[9px] text-muted-foreground mt-1 text-center w-16 leading-tight">{s.label}</span>
              </div>
              {i < STATUS_FLOW.length - 1 && (
                <div className={`h-0.5 w-6 flex-shrink-0 mb-4 ${i < currentStepIndex ? "bg-indigo-500" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1 md:hidden">← Scroll to see full pipeline →</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Client Info */}
        <div className="rounded-2xl border p-5 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-violet-500" />Client Details
          </h2>
          <div className="space-y-2 text-sm">
            <div className="font-medium">{enquiry.client?.name ?? "—"}</div>
            <a href={`tel:${enquiry.client?.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Phone className="w-3.5 h-3.5" />{enquiry.client?.phone}
            </a>
            <a href={`mailto:${enquiry.client?.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Mail className="w-3.5 h-3.5" />{enquiry.client?.email}
            </a>
          </div>
        </div>

        {/* Event Info */}
        <div className="rounded-2xl border p-5 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />Event Details
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />{formatDate(enquiry.event_date)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />{enquiry.city} · {enquiry.location}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <IndianRupee className="w-3.5 h-3.5" />
              {formatCurrency(enquiry.budget_min)} – {formatCurrency(enquiry.budget_max)}
            </div>
            {enquiry.artist_preference && (
              <p className="text-muted-foreground">Preference: {enquiry.artist_preference}</p>
            )}
          </div>
        </div>
      </div>

      {/* Assign Coordinator */}
      <div className="rounded-2xl border p-5 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-indigo-500" />Coordinator Assignment
        </h2>
        {enquiry.coordinator && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-sm">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
              {enquiry.coordinator.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{enquiry.coordinator.name}</p>
              <p className="text-xs text-muted-foreground">{enquiry.coordinator.email}</p>
            </div>
            <span className="ml-auto text-xs text-indigo-600 font-medium">Currently Assigned</span>
          </div>
        )}
        {!enquiry.coordinator && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            No coordinator assigned yet
          </div>
        )}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {enquiry.coordinator ? "Reassign Coordinator" : "Assign Coordinator"}
            </label>
            <Select value={coordinatorId} onValueChange={setCoordinatorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select coordinator..." />
              </SelectTrigger>
              <SelectContent>
                {coordinators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={reassignCoordinator} loading={assigning} disabled={!coordinatorId}>
            <UserCheck className="w-4 h-4 mr-1.5" />Assign
          </Button>
        </div>
      </div>

      {/* Update Status & Notes */}
      <div className="rounded-2xl border p-5 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-500" />Update Enquiry
        </h2>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FLOW.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Internal Notes / Requirements</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes, requirements, or context..."
            className="min-h-[100px]"
          />
        </div>
        <Button onClick={saveUpdate} loading={saving}>Save Changes</Button>
      </div>

      {/* Proposals */}
      <div className="rounded-2xl border p-5 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-cyan-500" />Proposals ({proposals.length})
        </h2>
        {proposals.length === 0 ? (
          <div className="py-8 text-center">
            <Send className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No proposals created yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p: any) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 text-sm"
              >
                <div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(p.status)}`}>
                    {getStatusLabel(p.status)}
                  </span>
                  <p className="text-muted-foreground mt-1">
                    {((p.artists_proposed as unknown[]) ?? []).length} artist(s) · {formatCurrency(p.quoted_price)}
                    {p.validity_date && ` · Valid till ${formatDate(p.validity_date)}`}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
