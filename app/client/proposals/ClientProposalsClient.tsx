"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Star,
  IndianRupee, Calendar, MapPin, Timer, Sparkles,
  Mic2, Clock, Shield, ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Proposal } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Props {
  proposals: (Proposal & {
    enquiry?: { event_type: string; event_date: string; city: string; location: string };
  })[];
  clientId: string;
}

function daysUntilValidity(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function ClientProposalsClient({ proposals }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(proposals.find((p) => p.status === "sent")?.id ?? null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [confirmDecline, setConfirmDecline] = useState<string | null>(null);

  const acceptProposal = async (proposalId: string, enquiryId: string) => {
    setAccepting(proposalId);
    try {
      const supabase = createClient();
      const proposal = proposals.find((p) => p.id === proposalId);
      await supabase.from("proposals").update({ status: "accepted" }).eq("id", proposalId);
      await supabase.from("enquiries").update({ status: "confirmed" }).eq("id", enquiryId);
      if (proposal?.coordinator_id) {
        await supabase.from("notifications").insert({
          user_id: proposal.coordinator_id,
          title: "Proposal Accepted",
          message: `Client has accepted the proposal for ${proposal.enquiry?.event_type ?? "the event"}. Create the booking now.`,
          type: "success",
          link: `/coordinator/enquiries/${enquiryId}`,
        });
      }
      toast.success("Booking confirmed! Our coordinator will be in touch shortly.", { duration: 5000 });
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
      toast.success("Proposal declined. Your coordinator will send a revised proposal.");
      setConfirmDecline(null);
      router.refresh();
    } catch {
      toast.error("Failed to decline proposal");
    } finally {
      setRejecting(null);
    }
  };

  const pendingProposals = proposals.filter((p) => p.status === "sent");
  const otherProposals   = proposals.filter((p) => p.status !== "sent");

  const ProposalCard = ({ proposal, isPending }: { proposal: Props["proposals"][0]; isPending: boolean }) => {
    const isOpen = expanded === proposal.id;
    const artists = (proposal.artists_proposed as {
      artist_id?: string; quoted_price: number; notes?: string; name?: string;
      artist?: { user: { name: string }; categories: string[]; rating: number };
    }[]) ?? [];

    const validityDays = proposal.validity_date ? daysUntilValidity(proposal.validity_date) : null;
    const isExpiringSoon = validityDays !== null && validityDays <= 3 && validityDays >= 0;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl border overflow-hidden transition-shadow ${
          isPending
            ? isExpiringSoon
              ? "border-red-300 shadow-lg shadow-red-100/60"
              : "border-amber-300 shadow-lg shadow-amber-100/60"
            : proposal.status === "accepted"
            ? "border-emerald-200"
            : "border-border opacity-70"
        }`}
      >
        {/* Top status bar */}
        {isPending && (
          <div className={`h-1.5 ${isExpiringSoon ? "bg-gradient-to-r from-red-400 to-orange-400 animate-pulse" : "gold-gradient"}`} />
        )}
        {proposal.status === "accepted" && <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />}

        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-display font-bold text-base sm:text-lg">{proposal.enquiry?.event_type ?? "Event"}</h3>
                {proposal.status === "accepted" && (
                  <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />Accepted
                  </span>
                )}
                {proposal.status === "rejected" && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-red-100 text-red-600">Declined</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(proposal.enquiry?.event_date ?? "")}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{proposal.enquiry?.city}</span>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="font-display font-bold text-xl sm:text-2xl text-indigo-700">{formatCurrency(proposal.quoted_price)}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Total package</p>
            </div>
          </div>

          {/* Validity warning */}
          {isPending && validityDays !== null && (
            <div className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
              validityDays <= 0 ? "bg-red-100 text-red-700 border border-red-200" :
              isExpiringSoon ? "bg-red-50 text-red-700 border border-red-200" :
              "bg-amber-50 text-amber-700 border border-amber-100"
            }`}>
              <Timer className="w-4 h-4 flex-shrink-0" />
              {validityDays <= 0
                ? "This proposal has expired. Please contact your coordinator."
                : validityDays === 1
                ? "Expires tomorrow! Accept to lock in this price."
                : `Offer valid for ${validityDays} more days — prices may change after`}
            </div>
          )}

          {/* Artist stacks */}
          {artists.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex -space-x-2">
                {artists.slice(0, 4).map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-full gold-gradient border-2 border-background flex items-center justify-center text-navy-900 text-[11px] font-bold">
                    {i + 1}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold">{artists.length} artist option{artists.length !== 1 ? "s" : ""} curated for you</p>
                <p className="text-xs text-muted-foreground">Handpicked by your coordinator</p>
              </div>
            </div>
          )}

          {/* Expand / collapse */}
          <button
            onClick={() => setExpanded(isOpen ? null : proposal.id)}
            className="mt-4 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {isOpen ? <><ChevronUp className="w-4 h-4" />Hide details</> : <><ChevronDown className="w-4 h-4" />View full proposal</>}
          </button>

          {/* Expanded details */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-5 pt-5 border-t space-y-5">
                  {/* Coordinator message */}
                  {proposal.content && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Message from your Coordinator</p>
                      <div className="relative p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
                        <div className="absolute top-3 left-3 w-1 h-8 bg-indigo-300 rounded-full" />
                        <p className="text-sm leading-relaxed pl-4">{proposal.content}</p>
                      </div>
                    </div>
                  )}

                  {/* Artist options */}
                  {artists.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Artist Options</p>
                      <div className="space-y-3">
                        {artists.map((a, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 p-4 rounded-2xl bg-card border hover:border-indigo-200 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="w-11 h-11 rounded-xl gold-gradient flex items-center justify-center text-navy-900 font-bold flex-shrink-0">
                                <Mic2 className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{a.name ?? `Artist Option ${i + 1}`}</p>
                                {a.notes && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.notes}</p>}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-base text-indigo-700">{formatCurrency(a.quoted_price)}</p>
                              <p className="text-[10px] text-muted-foreground">quoted</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trust signals */}
                  {isPending && (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: Shield, label: "Verified Artists", desc: "Background-verified" },
                        { icon: Star,   label: "Quality Assured",   desc: "Rated 4.5+ stars" },
                        { icon: Clock,  label: "On-time",           desc: "We handle logistics" },
                      ].map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="text-center p-2.5 rounded-xl bg-muted/30">
                          <Icon className="w-4 h-4 mx-auto mb-1 text-indigo-500" />
                          <p className="text-[10px] font-semibold leading-tight">{label}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight hidden sm:block">{desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── CTA Buttons ── */}
          {isPending && (
            <div className="mt-5 pt-5 border-t">
              {confirmDecline === proposal.id ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3"
                >
                  <p className="text-sm font-semibold text-red-800">Are you sure you want to decline?</p>
                  <p className="text-xs text-red-600">Your coordinator will reach out with a revised proposal. This may take 24–48 hours.</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" className="flex-1 h-11" onClick={() => setConfirmDecline(null)}>Keep Proposal</Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-11 border-red-300 text-red-600 hover:bg-red-50"
                      loading={rejecting === proposal.id}
                      onClick={() => rejectProposal(proposal.id)}
                    >
                      Yes, Decline
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {/* Primary CTA */}
                  <Button
                    className="w-full h-14 sm:h-14 text-base font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-200 rounded-2xl active:scale-[0.98] transition-transform"
                    loading={accepting === proposal.id}
                    onClick={() => acceptProposal(proposal.id, proposal.enquiry_id)}
                  >
                    <ThumbsUp className="w-5 h-5 mr-2 flex-shrink-0" />
                    Accept & Confirm Booking
                    <ArrowRight className="w-4 h-4 ml-2 flex-shrink-0" />
                  </Button>

                  <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    Secure · No payment charged until you confirm with coordinator
                  </p>

                  <button
                    className="w-full text-xs text-muted-foreground hover:text-red-500 transition-colors py-1"
                    onClick={() => { setExpanded(proposal.id); setConfirmDecline(proposal.id); }}
                  >
                    Not quite right? Decline and request revision
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  if (proposals.length === 0) {
    return (
      <div className="p-6 max-w-xl mx-auto py-24 text-center">
        <div className="flex justify-center mb-5">
          <BrandLogo size="lg" />
        </div>
        <h2 className="font-display font-bold text-2xl mb-2">No proposals yet</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Once you submit an enquiry, your coordinator will curate a personalised proposal with artist options.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-8">
      {/* Pending proposals */}
      {pendingProposals.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="font-display font-bold text-xl">
              {pendingProposals.length === 1
                ? "Your proposal is ready to review"
                : `${pendingProposals.length} proposals awaiting your decision`}
            </h2>
          </div>

          {/* Decision guidance */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-indigo-900">How to choose</p>
              <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
                Review each artist option's quoted price and notes. Once you accept, your coordinator will finalise the booking and collect the advance payment.
              </p>
            </div>
          </div>

          {pendingProposals.map((p) => <ProposalCard key={p.id} proposal={p} isPending />)}
        </div>
      )}

      {/* Past proposals */}
      {otherProposals.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Previous Proposals</h2>
          {otherProposals.map((p) => <ProposalCard key={p.id} proposal={p} isPending={false} />)}
        </div>
      )}
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
