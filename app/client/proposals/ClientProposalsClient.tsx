"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Star,
  IndianRupee,
  Calendar,
  MapPin,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Proposal } from "@/types";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Props {
  proposals: (Proposal & {
    enquiry?: { event_type: string; event_date: string; city: string; location: string };
  })[];
  clientId: string;
}

export function ClientProposalsClient({ proposals, clientId }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const acceptProposal = async (proposalId: string, enquiryId: string) => {
    setAccepting(proposalId);
    try {
      const supabase = createClient();
      await supabase.from("proposals").update({ status: "accepted" }).eq("id", proposalId);
      await supabase.from("enquiries").update({ status: "confirmed" }).eq("id", enquiryId);
      toast.success("Proposal accepted! Our coordinator will be in touch shortly.");
      router.refresh();
    } catch {
      toast.error("Failed to accept proposal");
    } finally {
      setAccepting(null);
    }
  };

  const rejectProposal = async (proposalId: string) => {
    setRejecting(proposalId);
    try {
      const supabase = createClient();
      await supabase.from("proposals").update({ status: "rejected" }).eq("id", proposalId);
      toast.success("Proposal declined. We'll send a revised proposal shortly.");
      router.refresh();
    } catch {
      toast.error("Failed to decline proposal");
    } finally {
      setRejecting(null);
    }
  };

  const pendingProposals = proposals.filter((p) => p.status === "sent");
  const otherProposals = proposals.filter((p) => p.status !== "sent");

  const ProposalCard = ({ proposal }: { proposal: Props["proposals"][0] }) => {
    const isExpanded = expanded === proposal.id;
    const artists = (proposal.artists_proposed as {
      artist_id: string;
      quoted_price: number;
      notes?: string;
      artist?: { user: { name: string }; categories: string[]; rating: number };
    }[]) ?? [];

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border overflow-hidden transition-all ${
          proposal.status === "sent" ? "border-gold-300 shadow-sm shadow-gold-100" : ""
        }`}
      >
        {proposal.status === "sent" && (
          <div className="h-1 gold-gradient" />
        )}
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{proposal.enquiry?.event_type ?? "Event"}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(proposal.status)}`}>
                  {getStatusLabel(proposal.status)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(proposal.enquiry?.event_date ?? "")}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {proposal.enquiry?.city}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-xl">{formatCurrency(proposal.quoted_price)}</p>
              <p className="text-xs text-muted-foreground">Total quoted</p>
            </div>
          </div>

          {/* Artists proposed count */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-2">
              {artists.slice(0, 3).map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full gold-gradient border-2 border-background flex items-center justify-center text-navy-900 text-[10px] font-bold"
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {artists.length} artist option{artists.length !== 1 ? "s" : ""} included
            </span>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setExpanded(isExpanded ? null : proposal.id)}
              className="flex items-center gap-1 text-sm text-gold-600 hover:text-gold-700 font-medium"
            >
              {isExpanded ? "Hide details" : "View details"}
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {proposal.status === "sent" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  loading={rejecting === proposal.id}
                  onClick={() => rejectProposal(proposal.id)}
                >
                  <XCircle className="w-4 h-4 mr-1.5" />Decline
                </Button>
                <Button
                  size="sm"
                  loading={accepting === proposal.id}
                  onClick={() => acceptProposal(proposal.id, proposal.enquiry_id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />Accept
                </Button>
              </div>
            )}
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t space-y-4">
                  {proposal.content && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">From your Coordinator</p>
                      <p className="text-sm leading-relaxed bg-muted/50 rounded-xl p-4">{proposal.content}</p>
                    </div>
                  )}

                  {artists.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Proposed Artists</p>
                      <div className="space-y-3">
                        {artists.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center text-navy-900 font-bold text-sm">
                                {i + 1}
                              </div>
                              <div>
                                <p className="font-medium text-sm">Artist Option {i + 1}</p>
                                {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                              </div>
                            </div>
                            <p className="font-bold text-sm">{formatCurrency(a.quoted_price)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {proposal.validity_date && (
                    <p className="text-xs text-muted-foreground">
                      <Timer className="w-3 h-3 inline mr-1" />Proposal valid until {formatDate(proposal.validity_date)}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {pendingProposals.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold-500" />
            Awaiting Your Review ({pendingProposals.length})
          </h2>
          <div className="space-y-4">
            {pendingProposals.map((p) => <ProposalCard key={p.id} proposal={p} />)}
          </div>
        </div>
      )}

      {otherProposals.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-lg mb-4">Previous Proposals</h2>
          <div className="space-y-4">
            {otherProposals.map((p) => <ProposalCard key={p.id} proposal={p} />)}
          </div>
        </div>
      )}

      {proposals.length === 0 && (
        <div className="py-20 text-center">
          <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-display font-semibold text-xl mb-2">No proposals yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Once you submit an enquiry and our coordinator shortlists artists, proposals will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

function ClipboardList({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}
