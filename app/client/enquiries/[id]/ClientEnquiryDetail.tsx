"use client";

import { useState } from "react";
import {
  ArrowLeft, Calendar, MapPin, IndianRupee, User, Phone, Mail,
  CheckCircle, Clock, ClipboardList, Send, Mic2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_FLOW = [
  { key: "new", label: "Enquiry Received" },
  { key: "assigned", label: "Coordinator Assigned" },
  { key: "requirement_gathering", label: "Requirements Gathered" },
  { key: "shortlisting", label: "Artists Shortlisted" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "confirmed", label: "Booking Confirmed" },
  { key: "in_progress", label: "Event In Progress" },
  { key: "completed", label: "Completed" },
];

export function ClientEnquiryDetail({ enquiry, proposals }: { enquiry: any; proposals: any[] }) {
  const router = useRouter();
  const [accepting, setAccepting] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const currentStepIndex = STATUS_FLOW.findIndex((s) => s.key === enquiry.status);

  const handleProposalAction = async (proposalId: string, action: "accepted" | "rejected") => {
    const setter = action === "accepted" ? setAccepting : setRejecting;
    setter(proposalId);
    const supabase = createClient();
    await supabase.from("proposals").update({ status: action }).eq("id", proposalId);
    if (action === "accepted") {
      await supabase.from("enquiries").update({ status: "confirmed" }).eq("id", enquiry.id);
      toast.success("Proposal accepted! Your coordinator will finalize the booking.");
    } else {
      toast.success("Proposal declined.");
    }
    setter(null);
    router.refresh();
  };

  const pendingProposals = proposals.filter((p) => p.status === "sent");

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/client/enquiries">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />Back to Enquiries
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{enquiry.event_type}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Submitted on {formatDate(enquiry.created_at)}
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(enquiry.status)}`}>
          {getStatusLabel(enquiry.status)}
        </span>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border p-5">
        <h2 className="font-semibold text-sm mb-5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />Booking Progress
        </h2>
        <div className="space-y-0">
          {STATUS_FLOW.map((step, i) => {
            const done = i < currentStepIndex;
            const active = i === currentStepIndex;
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    done ? "bg-emerald-500 text-white" :
                    active ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {done ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={`w-0.5 h-6 ${done ? "bg-emerald-300" : "bg-muted"}`} />
                  )}
                </div>
                <div className="pt-1 pb-2">
                  <p className={`text-sm font-medium ${active ? "text-blue-700" : done ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                  {active && (
                    <p className="text-xs text-blue-500 mt-0.5">Current stage</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details */}
      <div className="rounded-2xl border p-5">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-500" />Event Details
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />{formatDate(enquiry.event_date)}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />{enquiry.city}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <IndianRupee className="w-3.5 h-3.5" />
            {formatCurrency(enquiry.budget_min)} – {formatCurrency(enquiry.budget_max)}
          </div>
          {enquiry.artist_preference && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mic2 className="w-3.5 h-3.5" />{enquiry.artist_preference}
            </div>
          )}
        </div>
        {enquiry.other_requirements && (
          <div className="mt-3 p-3 rounded-xl bg-muted/40 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Additional Notes</p>
            {enquiry.other_requirements}
          </div>
        )}
      </div>

      {/* Coordinator */}
      {enquiry.coordinator && (
        <div className="rounded-2xl border p-5 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-violet-500" />Your Coordinator
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold">
              {enquiry.coordinator.name?.[0]?.toUpperCase()}
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{enquiry.coordinator.name}</p>
              <a href={`tel:${enquiry.coordinator.phone}`} className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />{enquiry.coordinator.phone}
              </a>
              <a href={`mailto:${enquiry.coordinator.email}`} className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />{enquiry.coordinator.email}
              </a>
            </div>
          </div>
          <Link href="/client/messages">
            <Button size="sm" variant="outline">
              <Send className="w-3.5 h-3.5 mr-1.5" />Message Coordinator
            </Button>
          </Link>
        </div>
      )}

      {/* Proposals */}
      <div className="rounded-2xl border p-5 space-y-4">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-cyan-500" />Proposals ({proposals.length})
        </h2>
        {proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No proposals received yet. Your coordinator is working on it.</p>
        ) : (
          <div className="space-y-4">
            {proposals.map((p: any) => (
              <div key={p.id} className="rounded-xl border overflow-hidden">
                <div className="p-4 bg-muted/20 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(p.status)}`}>
                      {getStatusLabel(p.status)}
                    </span>
                    <p className="font-bold mt-1">{formatCurrency(p.quoted_price)}</p>
                    {p.validity_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">Valid till {formatDate(p.validity_date)}</p>
                    )}
                  </div>
                  {p.status === "sent" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        loading={rejecting === p.id}
                        onClick={() => handleProposalAction(p.id, "rejected")}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        loading={accepting === p.id}
                        onClick={() => handleProposalAction(p.id, "accepted")}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />Accept
                      </Button>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {p.content && <p className="text-sm text-muted-foreground mb-3">{p.content}</p>}
                  {((p.artists_proposed as any[]) ?? []).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Artist Options</p>
                      {(p.artists_proposed as any[]).map((a: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-sm">
                          <div className="flex items-center gap-2">
                            <Mic2 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium">{a.name ?? a.artist_id}</span>
                          </div>
                          <span className="font-bold text-sm">{formatCurrency(a.quoted_price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
