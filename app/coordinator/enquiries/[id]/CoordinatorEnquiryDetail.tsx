"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, MapPin, IndianRupee, User, Phone, Mail,
  FileText, Clock, CheckCircle, Send, ClipboardList, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  enquiry: any;
  proposals: any[];
  coordinatorId: string;
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

export function CoordinatorEnquiryDetail({ enquiry, proposals, coordinatorId }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(enquiry.other_requirements ?? "");
  const [status, setStatus] = useState(enquiry.status);
  const [saving, setSaving] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(enquiry.follow_up_date ?? "");
  const [followUpNotes, setFollowUpNotes] = useState(enquiry.follow_up_notes ?? "");
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  const currentStepIndex = STATUS_FLOW.findIndex((s) => s.key === status);
  const today = new Date().toISOString().split("T")[0];
  const followUpDue = followUpDate && followUpDate <= today;

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

  const saveFollowUp = async () => {
    setSavingFollowUp(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("enquiries")
      .update({ follow_up_date: followUpDate || null, follow_up_notes: followUpNotes || null })
      .eq("id", enquiry.id);
    if (error) toast.error("Failed to save follow-up");
    else toast.success("Follow-up scheduled!");
    setSavingFollowUp(false);
    router.refresh();
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/coordinator/enquiries">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />Back to Enquiries
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{enquiry.event_type}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enquiry #{enquiry.id.slice(0, 8).toUpperCase()}
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
        <div className="relative">
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
          {STATUS_FLOW.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < currentStepIndex ? "bg-blue-500 text-white" :
                  i === currentStepIndex ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i < currentStepIndex ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="text-[9px] text-muted-foreground mt-1 text-center w-16 leading-tight">{s.label}</span>
              </div>
              {i < STATUS_FLOW.length - 1 && (
                <div className={`h-0.5 w-6 flex-shrink-0 mb-4 ${i < currentStepIndex ? "bg-blue-500" : "bg-muted"}`} />
              )}
            </div>
          ))}
          </div>
          {/* Fade gradient hint for mobile */}
          <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
        </div>
        <p className="text-xs text-muted-foreground mt-1 md:hidden">Scroll to see all steps →</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Client Info */}
        <div className="rounded-2xl border p-5 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-violet-500" />Client Details
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 font-medium">{enquiry.client?.name}</div>
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

      {/* Update Status & Notes */}
      <div className="rounded-2xl border p-5 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-500" />Update Enquiry
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Update Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FLOW.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Requirements / Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes, requirements, or follow-up details..."
            className="min-h-[100px]"
          />
        </div>
        <Button onClick={saveUpdate} loading={saving}>Save Changes</Button>
      </div>

      {/* Follow-up Tracker */}
      <div className="rounded-2xl border p-5 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Bell className={`w-4 h-4 ${followUpDue ? "text-red-500" : "text-violet-500"}`} />
          Follow-up Tracker
          {followUpDue && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold ml-1">
              Due Today
            </span>
          )}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Next Follow-up Date</Label>
            <Input
              type="date"
              value={followUpDate}
              min={today}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Follow-up Notes</Label>
            <Input
              placeholder="e.g. Call client to confirm budget, check artist availability…"
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          {enquiry.follow_up_date && (
            <p className="text-xs text-muted-foreground">
              Last saved: {new Date(enquiry.follow_up_date).toLocaleDateString("en-IN")}
              {enquiry.follow_up_notes && ` — ${enquiry.follow_up_notes}`}
            </p>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={saveFollowUp}
            loading={savingFollowUp}
            className="ml-auto"
          >
            <Bell className="w-3.5 h-3.5 mr-1.5" />Save Follow-up
          </Button>
        </div>
      </div>

      {/* Proposals */}
      <div className="rounded-2xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-cyan-500" />Proposals ({proposals.length})
          </h2>
          <Link href="/coordinator/proposals">
            <Button size="sm" variant="outline">
              <Send className="w-3.5 h-3.5 mr-1.5" />Manage Proposals
            </Button>
          </Link>
        </div>
        {proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No proposals created yet.</p>
        ) : (
          <div className="space-y-3">
            {proposals.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 text-sm">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
