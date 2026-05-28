"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Star, ExternalLink,
  IndianRupee, Calendar, MapPin, Timer, Sparkles,
  Mic2, Clock, Shield, ThumbsUp, UserCheck, MessageSquare,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Proposal } from "@/types";
import { formatDate, formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type ProposalWithExtras = Proposal & {
  enquiry?: { event_type: string; event_date: string; city: string; location: string; other_requirements?: string };
  client_chosen_artist_id?: string | null;
  client_revision_notes?: string | null;
};

interface Props {
  proposals: ProposalWithExtras[];
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
  // Re-render every minute so validity countdowns never show a stale value
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Track client's artist choice per proposal (pre-fill from existing DB value)
  const [chosenArtist, setChosenArtist] = useState<Record<string, string>>(() =>
    Object.fromEntries(proposals.filter((p) => p.client_chosen_artist_id).map((p) => [p.id, p.client_chosen_artist_id!]))
  );
  // Revision request state
  const [revisionOpen, setRevisionOpen] = useState<string | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [sendingRevision, setSendingRevision] = useState(false);

  const selectArtist = async (proposalId: string, artistId: string) => {
    setChosenArtist((prev) => ({ ...prev, [proposalId]: artistId }));
    const supabase = createClient();
    await supabase.from("proposals").update({ client_chosen_artist_id: artistId }).eq("id", proposalId);
  };

  const sendRevisionRequest = async (proposalId: string) => {
    if (!revisionNotes.trim()) { toast.error("Please describe what you'd like changed"); return; }
    setSendingRevision(true);
    const supabase = createClient();
    const proposal = proposals.find((p) => p.id === proposalId);
    await supabase.from("proposals").update({ status: "rejected", client_revision_notes: revisionNotes.trim() }).eq("id", proposalId);
    if (proposal?.coordinator_id) {
      await supabase.from("notifications").insert({
        user_id: proposal.coordinator_id,
        title: "Client Requested Revision",
        message: `Client wants changes to the proposal for ${proposal.enquiry?.event_type ?? "event"}: "${revisionNotes.trim()}"`,
        type: "warning",
        link: `/coordinator/proposals`,
      });
    }
    toast.success("Revision request sent. Your coordinator will send an updated proposal.");
    setRevisionOpen(null);
    setRevisionNotes("");
    setSendingRevision(false);
    router.refresh();
  };

  const acceptProposal = async (proposalId: string, enquiryId: string) => {
    const proposal = proposals.find((p) => p.id === proposalId);
    const artists = (proposal?.artists_proposed as any[]) ?? [];

    // Enforce expiry
    if (proposal?.validity_date) {
      const days = daysUntilValidity(proposal.validity_date);
      if (days < 0) {
        toast.error("This proposal has expired. Please ask your coordinator for a new one.");
        return;
      }
    }

    // Require artist selection when multiple options exist
    if (artists.length > 1 && !chosenArtist[proposalId]) {
      toast.error("Please select which artist you'd like before confirming.");
      setExpanded(proposalId); // ensure expanded so they see the selection
      return;
    }

    setAccepting(proposalId);
    try {
      const supabase = createClient();
      const chosen = chosenArtist[proposalId] ?? artists[0]?.artist_id ?? null;
      const chosenName = artists.find((a: any) => a.artist_id === chosen)?.name
        ?? (artists.length === 1 ? artists[0]?.name : null);

      await supabase.from("proposals").update({
        status: "accepted",
        client_chosen_artist_id: chosen,
      }).eq("id", proposalId);
      await supabase.from("enquiries").update({ status: "confirmed" }).eq("id", enquiryId);

      if (proposal?.coordinator_id) {
        await supabase.from("notifications").insert({
          user_id: proposal.coordinator_id,
          title: "Proposal Accepted",
          message: `Client accepted the proposal for ${proposal.enquiry?.event_type ?? "event"}${chosenName ? ` and chose ${chosenName}` : ""}. Please create the booking now.`,
          type: "success",
          link: `/coordinator/proposals`,
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
      setConfirmDecline(null);
      let undone = false;
      const tid = window.setTimeout(() => { if (!undone) router.refresh(); }, 6000);
      toast(
        (t) => (
          <span className="flex items-center gap-3 text-sm">
            Proposal declined
            <button
              className="font-semibold text-indigo-600 underline"
              onClick={async () => {
                undone = true;
                clearTimeout(tid);
                toast.dismiss(t.id);
                await supabase.from("proposals").update({ status: "sent" }).eq("id", proposalId);
                router.refresh();
                toast.success("Decline undone — proposal is active again.");
              }}
            >
              Undo
            </button>
          </span>
        ),
        { duration: 6000 }
      );
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
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {artists.length === 1 ? "Your Artist" : `Choose Your Artist (${artists.length} options)`}
                        </p>
                        {isPending && artists.length > 1 && !chosenArtist[proposal.id] && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            Select one to confirm booking
                          </span>
                        )}
                        {chosenArtist[proposal.id] && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />Artist selected
                          </span>
                        )}
                      </div>
                      <div className="space-y-3">
                        {artists.map((a, i) => {
                          const isChosen = chosenArtist[proposal.id] === a.artist_id;
                          const anyChosen = !!chosenArtist[proposal.id];
                          return (
                            <div
                              key={i}
                              className={`p-4 rounded-2xl border transition-all ${
                                isChosen
                                  ? "border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-300"
                                  : anyChosen
                                  ? "border-border bg-card opacity-60"
                                  : "border-border bg-card hover:border-indigo-200"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-navy-900 font-bold flex-shrink-0 ${
                                    isChosen ? "bg-emerald-200" : "gold-gradient"
                                  }`}>
                                    {isChosen ? <UserCheck className="w-5 h-5 text-emerald-700" /> : <Mic2 className="w-5 h-5" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-sm">{a.name ?? `Artist Option ${i + 1}`}</p>
                                      {isChosen && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">Your choice</span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      {a.artist?.categories?.slice(0, 2).map((c: string) => (
                                        <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">{c}</span>
                                      ))}
                                      {a.artist?.rating ? (
                                        <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold">
                                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                          {a.artist.rating.toFixed(1)}
                                        </span>
                                      ) : null}
                                    </div>
                                    {a.notes && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{a.notes}</p>}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0 space-y-2">
                                  <div>
                                    <p className="font-bold text-base text-indigo-700">{formatCurrency(a.quoted_price)}</p>
                                    <p className="text-[10px] text-muted-foreground">for your event</p>
                                  </div>
                                  {/* Choose button — only when pending + multiple options */}
                                  {isPending && artists.length > 1 && a.artist_id && (
                                    <button
                                      onClick={() => selectArtist(proposal.id, a.artist_id!)}
                                      className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                                        isChosen
                                          ? "bg-emerald-600 text-white border-emerald-600"
                                          : "border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                                      }`}
                                    >
                                      {isChosen ? "✓ Selected" : "Choose"}
                                    </button>
                                  )}
                                </div>
                              </div>
                              {a.name && (
                                <a
                                  href={`/artists?search=${encodeURIComponent(a.name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  View full profile & portfolio
                                </a>
                              )}
                            </div>
                          );
                        })}
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
                  {/* Artist selection reminder */}
                  {artists.length > 1 && !chosenArtist[proposal.id] && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                      <UserCheck className="w-4 h-4 shrink-0" />
                      Scroll up and select which artist you&apos;d like — then you can confirm.
                    </div>
                  )}

                  {/* Primary CTA */}
                  <Button
                    className="w-full h-14 sm:h-14 text-base font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-200 rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-50"
                    loading={accepting === proposal.id}
                    disabled={artists.length > 1 && !chosenArtist[proposal.id]}
                    onClick={() => acceptProposal(proposal.id, proposal.enquiry_id)}
                  >
                    <ThumbsUp className="w-5 h-5 mr-2 flex-shrink-0" />
                    {artists.length > 1 && chosenArtist[proposal.id]
                      ? `Confirm — ${artists.find((a: any) => a.artist_id === chosenArtist[proposal.id])?.name ?? "Selected Artist"}`
                      : artists.length === 1
                      ? `Confirm — ${artists[0]?.name ?? "Booking"}`
                      : "Select an artist above to confirm"}
                    {(artists.length === 1 || chosenArtist[proposal.id]) && <ArrowRight className="w-4 h-4 ml-2 flex-shrink-0" />}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    Secure · No payment charged until you confirm with coordinator
                  </p>

                  {/* Two secondary actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="flex items-center justify-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 hover:bg-amber-100 transition-colors"
                      onClick={() => { setRevisionOpen(proposal.id); setRevisionNotes(""); }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Request Changes
                    </button>
                    <button
                      className="flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 hover:bg-red-100 transition-colors"
                      onClick={() => { setExpanded(proposal.id); setConfirmDecline(proposal.id); }}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Decline
                    </button>
                  </div>
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
              <p className="text-sm font-semibold text-indigo-900">How it works</p>
              <ol className="text-xs text-indigo-700 mt-1 leading-relaxed space-y-0.5 list-decimal list-inside">
                <li>Expand the proposal to see your artist options</li>
                <li>Click <strong>Choose</strong> on the artist you prefer</li>
                <li>Hit <strong>Confirm Booking</strong> — your coordinator gets notified instantly</li>
                <li>Need changes? Use <strong>Request Changes</strong> to tell us what to adjust</li>
              </ol>
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

      {/* Revision request dialog */}
      <Dialog open={!!revisionOpen} onOpenChange={(o) => { if (!o) setRevisionOpen(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Tell your coordinator exactly what you&apos;d like changed — budget, artist category, dates, or anything else.
            </p>
            <Textarea
              placeholder="e.g. Can you find someone in a lower price range? Or do you have a Sufi singer available for this date?"
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRevisionOpen(null)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!revisionNotes.trim() || sendingRevision}
                onClick={() => revisionOpen && sendRevisionRequest(revisionOpen)}
              >
                {sendingRevision ? "Sending…" : "Send Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
