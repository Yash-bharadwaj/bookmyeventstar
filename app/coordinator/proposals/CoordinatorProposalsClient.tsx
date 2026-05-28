"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Send, Trash2, Building2, Star, Phone,
  IndianRupee, Calendar, MapPin, Mic2, Info,
  CheckCircle, Clock, ChevronDown, Eye, Shield,
  ThumbsUp, ChevronRight, X, AlertCircle, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Proposal } from "@/types";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface ProposalWithExtras extends Omit<Proposal, "enquiry"> {
  enquiry?: { event_type: string; event_date: string; city: string; client?: { name: string } };
}

interface EnquiryOption {
  id: string; event_type: string; event_date: string; city: string;
  budget_min: number; budget_max: number;
  client?: { name: string } | null;
}

interface ArtistDB {
  id: string; categories: string[]; cities: string[]; base_price: number;
  rating: number; total_bookings: number;
  user: { name: string; phone: string } | null;
}

interface SelectedArtist {
  artistId: string;   // from DB
  name: string;       // display
  price: number;
  notes: string;
}

interface Props {
  proposals: ProposalWithExtras[];
  coordinatorId: string;
  enquiries: EnquiryOption[];
  artists: ArtistDB[];
  cityList: string[];
}

const DEFAULT_VALIDITY_DAYS = 7;

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function CoordinatorProposalsClient({
  proposals, coordinatorId, enquiries, artists, cityList,
}: Props) {
  const router = useRouter();
  const [sending, setSending] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showBooking, setShowBooking] = useState<ProposalWithExtras | null>(null);
  const [previewProposal, setPreviewProposal] = useState<ProposalWithExtras | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);

  // ── Proposal form ──
  const [selectedEnquiryId, setSelectedEnquiryId] = useState("");
  const [content, setContent] = useState("");
  const [validityDate, setValidityDate] = useState(addDays(DEFAULT_VALIDITY_DAYS));
  const [selectedArtists, setSelectedArtists] = useState<SelectedArtist[]>([
    { artistId: "", name: "", price: 0, notes: "" },
  ]);
  // Artist date conflict map: artistId → true if booked on event date
  const [conflictMap, setConflictMap] = useState<Record<string, boolean>>({});

  // ── Booking form ──
  const [venue, setVenue] = useState("");
  const [bookingCity, setBookingCity] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [selectedBookingArtistId, setSelectedBookingArtistId] = useState("");

  // Derive the selected enquiry object
  const selectedEnquiry = useMemo(
    () => enquiries.find((e) => e.id === selectedEnquiryId) ?? null,
    [selectedEnquiryId, enquiries]
  );

  // Filter artists to those who serve the enquiry's city (or all if no city match)
  const suggestedArtists = useMemo(() => {
    if (!selectedEnquiry) return artists;
    const city = selectedEnquiry.city.toLowerCase();
    const matching = artists.filter((a) =>
      a.cities.some((c) => c.toLowerCase().includes(city) || city.includes(c.toLowerCase()))
    );
    return matching.length > 0 ? matching : artists;
  }, [selectedEnquiry, artists]);

  const handleEnquirySelect = (id: string) => {
    setSelectedEnquiryId(id);
    const enq = enquiries.find((e) => e.id === id);
    if (enq) {
      // Auto-fill content template
      setContent(
        `Dear ${enq.client?.name ?? "Client"},\n\nThank you for your enquiry for ${enq.event_type} in ${enq.city} on ${formatDate(enq.event_date)}.\n\nBased on your requirements and budget, we have curated the following artist options for you. Please review and let us know your preference.`
      );
    }
  };

  const updateSelectedArtist = (i: number, artistId: string) => {
    const a = artists.find((x) => x.id === artistId);
    setSelectedArtists((prev) =>
      prev.map((s, idx) =>
        idx === i
          ? { artistId, name: a?.user?.name ?? "", price: a?.base_price ?? 0, notes: "" }
          : s
      )
    );
    // Check availability on event date
    const eventDate = enquiries.find((e) => e.id === selectedEnquiryId)?.event_date;
    if (artistId && eventDate && !(artistId in conflictMap)) {
      createClient()
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("artist_id", (a as any)?.user_id ?? artistId)
        .eq("event_date", eventDate)
        .not("status", "in", "(cancelled)")
        .then(({ count }) => {
          setConflictMap((prev) => ({ ...prev, [artistId]: (count ?? 0) > 0 }));
        });
    }
  };

  const updateArtistField = (i: number, field: keyof SelectedArtist, value: string | number) =>
    setSelectedArtists((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const addArtistSlot = () =>
    setSelectedArtists((prev) =>
      prev.length >= MAX_ARTISTS ? prev : [...prev, { artistId: "", name: "", price: 0, notes: "" }]
    );

  const removeArtistSlot = (i: number) =>
    setSelectedArtists((prev) => prev.filter((_, idx) => idx !== i));

  const totalQuoted = selectedArtists.reduce((s, a) => Math.max(s, a.price), 0);

  const MAX_ARTISTS = 5;

  const resetForm = () => {
    setSelectedEnquiryId(""); setContent(""); setValidityDate(addDays(DEFAULT_VALIDITY_DAYS));
    setSelectedArtists([{ artistId: "", name: "", price: 0, notes: "" }]);
  };

  // Read localStorage on mount (coming from shortlist page) OR URL param (coming from re-propose flow)
  useEffect(() => {
    // URL param: ?enquiry=ID (from re-propose button on cancelled bookings)
    const urlEnquiryId = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("enquiry") ?? ""
      : "";
    if (urlEnquiryId && !showCreate) {
      const enq = enquiries.find((e) => e.id === urlEnquiryId);
      if (enq) {
        setSelectedEnquiryId(urlEnquiryId);
        setShowCreate(true);
      }
    }

    const storedArtistIds: string[] = JSON.parse(localStorage.getItem("shortlisted_artists") ?? "[]");
    const storedEnquiryId: string = localStorage.getItem("shortlisted_enquiry") ?? "";

    if (storedArtistIds.length === 0 && !storedEnquiryId) return;

    // Clear so re-navigating doesn't re-trigger
    localStorage.removeItem("shortlisted_artists");
    localStorage.removeItem("shortlisted_enquiry");

    // Pre-fill enquiry
    if (storedEnquiryId) {
      const enq = enquiries.find((e) => e.id === storedEnquiryId);
      if (enq) {
        setSelectedEnquiryId(storedEnquiryId);
        setContent(
          `Dear ${enq.client?.name ?? "Client"},\n\nThank you for your enquiry for ${enq.event_type} in ${enq.city} on ${formatDate(enq.event_date)}.\n\nBased on your requirements and budget, we have curated the following artist options for you. Please review and let us know your preference.`
        );
      }
    }

    // Pre-fill artists (max 5)
    const capped = storedArtistIds.slice(0, MAX_ARTISTS);
    if (capped.length > 0) {
      const slots: SelectedArtist[] = capped.map((id) => {
        const a = artists.find((x) => x.id === id);
        return a
          ? { artistId: id, name: a.user?.name ?? "", price: a.base_price, notes: "" }
          : { artistId: id, name: "", price: 0, notes: "" };
      });
      setSelectedArtists(slots);
    }

    // Auto-open the create dialog
    setShowCreate(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendProposal = async (proposalId: string, enquiryId: string) => {
    setSending(proposalId);
    const supabase = createClient();
    await supabase.from("proposals").update({ status: "sent" }).eq("id", proposalId);
    await supabase.from("enquiries").update({ status: "proposal_sent" }).eq("id", enquiryId);
    const { data: enq } = await supabase.from("enquiries").select("client_id,event_type").eq("id", enquiryId).single();
    if (enq?.client_id) {
      await supabase.from("notifications").insert({
        user_id: enq.client_id, title: "Proposal Ready for Review",
        message: `Your proposal for ${enq.event_type} is ready. Please review the artist options.`,
        type: "success", link: "/client/proposals",
      });
    }
    toast.success("Proposal sent to client!");
    setSending(null);
    router.refresh();
  };

  const createProposal = async () => {
    if (!selectedEnquiryId || !content || !validityDate) {
      toast.error("Select an enquiry, add a message and set validity date");
      return;
    }
    const filledArtists = selectedArtists.filter((a) => a.artistId && a.price > 0);
    if (filledArtists.length === 0) {
      toast.error("Select at least one artist");
      return;
    }
    setCreating(true);
    try {
      const supabase = createClient();
      const artistsProposed = filledArtists.map((a) => ({
        artist_id: a.artistId,
        name: a.name,
        quoted_price: a.price,
        notes: a.notes,
      }));
      const maxPrice = Math.max(...filledArtists.map((a) => a.price));
      const { error } = await supabase.from("proposals").insert({
        enquiry_id: selectedEnquiryId,
        coordinator_id: coordinatorId,
        content,
        artists_proposed: artistsProposed,
        quoted_price: maxPrice,
        validity_date: validityDate,
        status: "draft",
      });
      if (error) throw error;
      toast.success("Proposal saved as draft! Review and send to client.");
      setShowCreate(false);
      resetForm();
      router.refresh();
    } catch {
      toast.error("Failed to create proposal");
    } finally {
      setCreating(false);
    }
  };

  const createBooking = async (proposal: ProposalWithExtras) => {
    if (!venue || !bookingCity || !totalAmount || !advanceAmount) {
      toast.error("Please fill all booking details");
      return;
    }
    if (!selectedBookingArtistId) {
      toast.error("Please select the confirmed artist");
      return;
    }
    setCreatingBooking(true);
    try {
      const supabase = createClient();
      const { data: newBooking, error } = await supabase.from("bookings").insert({
        enquiry_id: proposal.enquiry_id,
        coordinator_id: coordinatorId,
        artist_id: selectedBookingArtistId,
        event_date: proposal.enquiry?.event_date,
        venue, city: bookingCity,
        total_amount: Number(totalAmount),
        advance_amount: Number(advanceAmount),
        status: "pending",
        // Use client's actual event requirements (other_requirements from enquiry), not the coordinator's proposal message
        special_requirements: (proposal as any).enquiry?.other_requirements ?? null,
      }).select("id").single();
      if (error) throw error;
      await supabase.from("enquiries").update({ status: "confirmed" }).eq("id", proposal.enquiry_id);
      // Notify client
      const { data: enq } = await supabase.from("enquiries").select("client_id,event_type").eq("id", proposal.enquiry_id).single();
      if (enq?.client_id) {
        await supabase.from("notifications").insert({
          user_id: enq.client_id, title: "Booking Confirmed!",
          message: `Your ${enq.event_type} booking has been created. Artist confirmation pending.`,
          type: "success", link: "/client/events",
        });
      }
      // Notify the selected artist
      const { data: artistProfile } = await supabase
        .from("artist_profiles")
        .select("user_id")
        .eq("id", selectedBookingArtistId)
        .single();
      if (artistProfile?.user_id) {
        await supabase.from("notifications").insert({
          user_id: artistProfile.user_id,
          title: "New Booking Request",
          message: `You have a new booking request for ${enq?.event_type ?? "an event"} in ${bookingCity} on ${proposal.enquiry?.event_date ? new Date(proposal.enquiry.event_date).toLocaleDateString("en-IN") : ""}. Please accept or decline.`,
          type: "info",
          link: "/artist/bookings",
        });
      }
      toast.success("Booking created! Artist has been notified to confirm.");
      setShowBooking(null);
      setVenue(""); setBookingCity(""); setTotalAmount(""); setAdvanceAmount(""); setSelectedBookingArtistId("");
      router.refresh();
    } catch {
      toast.error("Failed to create booking");
    } finally {
      setCreatingBooking(false);
    }
  };

  const drafts   = proposals.filter((p) => p.status === "draft");
  const sent     = proposals.filter((p) => p.status === "sent");
  const accepted = proposals.filter((p) => p.status === "accepted");

  const ProposalCard = ({ p }: { p: ProposalWithExtras }) => {
    const artists_list = (p.artists_proposed as any[]) ?? [];
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border overflow-hidden hover:shadow-md transition-all"
      >
        {p.status === "draft" && <div className="h-1 bg-gradient-to-r from-indigo-400 to-violet-500" />}
        {p.status === "sent"  && <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />}
        {p.status === "accepted" && <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />}

        <div className="p-4 border-b bg-muted/20 flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{p.enquiry?.event_type ?? "Event"}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(p.status)}`}>
                {getStatusLabel(p.status)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {p.enquiry?.client?.name} · {p.enquiry?.city} · {formatDate(p.enquiry?.event_date ?? "")}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs flex items-center gap-1 text-muted-foreground">
                <Mic2 className="w-3 h-3" />{artists_list.length} artist{artists_list.length !== 1 ? "s" : ""}
              </span>
              {p.validity_date && (
                <span className="text-xs flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />Valid till {formatDate(p.validity_date)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <p className="font-bold text-indigo-700">{formatCurrency(p.quoted_price)}</p>

            {/* Preview button — always visible */}
            <Button size="sm" variant="outline" onClick={() => setPreviewProposal(p)}>
              <Eye className="w-3.5 h-3.5 mr-1.5" />Preview
            </Button>

            {p.status === "draft" && (
              <Button size="sm" loading={sending === p.id} onClick={() => sendProposal(p.id, p.enquiry_id)}>
                <Send className="w-3.5 h-3.5 mr-1.5" />Send to Client
              </Button>
            )}
            {p.status === "accepted" && (
              <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700"
                onClick={() => {
                  setShowBooking(p);
                  setBookingCity(p.enquiry?.city ?? "");
                  setTotalAmount(String(p.quoted_price));
                  setAdvanceAmount(String(Math.round(p.quoted_price * 0.3)));
                  const list = (p.artists_proposed as any[]) ?? [];
                  // Pre-fill with client's chosen artist (if set), else single artist, else empty
                  const clientChoice = (p as any).client_chosen_artist_id;
                  if (clientChoice) setSelectedBookingArtistId(clientChoice);
                  else if (list.length === 1) setSelectedBookingArtistId(list[0].artist_id);
                  else setSelectedBookingArtistId("");
                  // Pre-fill quoted price of chosen artist
                  if (clientChoice) {
                    const chosen = list.find((a: any) => a.artist_id === clientChoice);
                    if (chosen?.quoted_price) {
                      setTotalAmount(String(chosen.quoted_price));
                      setAdvanceAmount(String(Math.round(chosen.quoted_price * 0.3)));
                    }
                  }
                }}>
                <Building2 className="w-3.5 h-3.5 mr-1.5" />Create Booking
              </Button>
            )}
          </div>
        </div>
        {artists_list.length > 0 && (
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {artists_list.map((a: any, i: number) => {
              const isClientChoice = a.artist_id === (p as any).client_chosen_artist_id;
              return (
                <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${isClientChoice ? "bg-emerald-50 border-emerald-300" : "bg-muted/40 border-border"}`}>
                  <Mic2 className="w-3 h-3 text-muted-foreground" />
                  <span className={`font-medium ${isClientChoice ? "text-emerald-800" : ""}`}>{a.name ?? `Option ${i + 1}`}</span>
                  {isClientChoice && <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold">Client picked</span>}
                  <span className={`font-semibold ${isClientChoice ? "text-emerald-700" : "text-indigo-600"}`}>{formatCurrency(a.quoted_price)}</span>
                </div>
              );
            })}
          </div>
        )}
        {/* Client revision request banner */}
        {(p as any).client_revision_notes && p.status === "rejected" && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <span className="font-semibold">Client requested changes: </span>
            {(p as any).client_revision_notes}
          </div>
        )}
      </motion.div>
    );
  };

  /* ── Client-view preview of a proposal ── */
  const ProposalPreview = ({ p }: { p: ProposalWithExtras }) => {
    const artists_list = (p.artists_proposed as any[]) ?? [];
    const validityDays = p.validity_date
      ? Math.round((new Date(p.validity_date).getTime() - Date.now()) / 86400000)
      : null;

    return (
      <div className="space-y-5">
        {/* "You are previewing as client" banner */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-700 font-medium">
          <Eye className="w-3.5 h-3.5 flex-shrink-0" />
          This is exactly what <span className="font-bold mx-1">{p.enquiry?.client?.name ?? "the client"}</span> will see when you send this proposal.
        </div>

        {/* Proposal card — mirrors ClientProposalsClient */}
        <div className="rounded-2xl border border-amber-300 overflow-hidden shadow-lg shadow-amber-100/60">
          <div className="h-1.5 gold-gradient" />
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-lg">{p.enquiry?.event_type ?? "Event"}</h3>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(p.enquiry?.event_date ?? "")}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.enquiry?.city}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-display font-bold text-2xl text-indigo-700">{formatCurrency(p.quoted_price)}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Total package</p>
              </div>
            </div>

            {/* Validity warning */}
            {validityDays !== null && (
              <div className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
                validityDays <= 3
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-amber-50 text-amber-700 border border-amber-100"
              }`}>
                <Timer className="w-4 h-4 flex-shrink-0" />
                {validityDays <= 0
                  ? "This proposal has expired."
                  : validityDays === 1
                  ? "Expires tomorrow! Accept to lock in this price."
                  : `Offer valid for ${validityDays} more days`}
              </div>
            )}

            {/* Artist stacks */}
            {artists_list.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {artists_list.slice(0, 4).map((_: any, i: number) => (
                    <div key={i} className="w-8 h-8 rounded-full gold-gradient border-2 border-background flex items-center justify-center text-navy-900 text-[11px] font-bold">
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-semibold">{artists_list.length} artist option{artists_list.length !== 1 ? "s" : ""} curated for you</p>
                  <p className="text-xs text-muted-foreground">Handpicked by your coordinator</p>
                </div>
              </div>
            )}

            {/* Expanded details (always shown in preview) */}
            <div className="mt-5 pt-5 border-t space-y-5">
              {/* Coordinator message */}
              {p.content && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Message from your Coordinator</p>
                  <div className="relative p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
                    <div className="absolute top-3 left-3 w-1 h-8 bg-indigo-300 rounded-full" />
                    <p className="text-sm leading-relaxed pl-4 whitespace-pre-line">{p.content}</p>
                  </div>
                </div>
              )}

              {/* Artist options */}
              {artists_list.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Artist Options</p>
                  <div className="space-y-3">
                    {artists_list.map((a: any, i: number) => (
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
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Shield,       label: "Verified Artists", desc: "Background-verified performers" },
                  { icon: Star,         label: "Quality Assured",  desc: "Rated 4.5+ by past clients" },
                  { icon: Clock,        label: "On-time Guarantee",desc: "We handle all logistics" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="text-center p-3 rounded-xl bg-muted/30">
                    <Icon className="w-4 h-4 mx-auto mb-1.5 text-indigo-500" />
                    <p className="text-[10px] font-semibold">{label}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{desc}</p>
                  </div>
                ))}
              </div>

              {/* Client CTA (read-only in preview) */}
              <div className="space-y-2 opacity-60 pointer-events-none select-none">
                <div className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold gap-2 text-base">
                  <ThumbsUp className="w-5 h-5" />Accept &amp; Confirm Booking
                  <ChevronRight className="w-4 h-4" />
                </div>
                <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <Shield className="w-3 h-3" />Secure · No payment charged until coordinator confirms
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="rounded-2xl border bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Before sending — checklist</p>
          {[
            { ok: artists_list.length > 0,       label: `${artists_list.length} artist option${artists_list.length !== 1 ? "s" : ""} added` },
            { ok: !!p.content,                   label: "Message to client written" },
            { ok: !!p.validity_date,             label: `Validity date set (${p.validity_date ? formatDate(p.validity_date) : "missing"})` },
            { ok: artists_list.every((a: any) => a.quoted_price > 0), label: "All artist prices filled" },
          ].map(({ ok, label }) => (
            <div key={label} className={`flex items-center gap-2 text-sm ${ok ? "text-emerald-700" : "text-red-600"}`}>
              {ok
                ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {label}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowCreate(true)} disabled={enquiries.length === 0}>
          <Plus className="w-4 h-4 mr-2" />New Proposal
        </Button>
      </div>

      {enquiries.length === 0 && proposals.length === 0 && (
        <div className="py-20 text-center rounded-2xl border-2 border-dashed border-muted text-muted-foreground text-sm">
          <Send className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No enquiries assigned yet</p>
          <p className="text-xs mt-1">Enquiries assigned to you will appear here for proposal creation</p>
        </div>
      )}

      <Tabs defaultValue="drafts">
        <TabsList>
          <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({accepted.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="drafts" className="mt-6 space-y-4">
          {drafts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Send className="w-8 h-8 mx-auto mb-2 opacity-20" />No drafts yet
            </div>
          ) : drafts.map((p) => <ProposalCard key={p.id} p={p} />)}
        </TabsContent>
        <TabsContent value="sent" className="mt-6 space-y-4">
          {sent.length === 0
            ? <p className="text-center py-12 text-muted-foreground text-sm">No sent proposals</p>
            : sent.map((p) => <ProposalCard key={p.id} p={p} />)}
        </TabsContent>
        <TabsContent value="accepted" className="mt-6 space-y-4">
          {accepted.length === 0
            ? <p className="text-center py-12 text-muted-foreground text-sm">No accepted proposals yet</p>
            : accepted.map((p) => <ProposalCard key={p.id} p={p} />)}
        </TabsContent>
      </Tabs>

      {/* ══════════════════════════════════════════
          PREVIEW DIALOG
      ══════════════════════════════════════════ */}
      <Dialog open={!!previewProposal} onOpenChange={(o) => !o && setPreviewProposal(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-500" />Client View Preview
              </DialogTitle>
            </div>
          </DialogHeader>

          {previewProposal && (
            <>
              <ProposalPreview p={previewProposal} />

              {/* Action footer */}
              <div className="flex gap-3 pt-4 border-t mt-2">
                <Button variant="outline" className="flex-1" onClick={() => setPreviewProposal(null)}>
                  <X className="w-4 h-4 mr-2" />Close Preview
                </Button>
                {previewProposal.status === "draft" && (
                  <Button
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                    loading={sending === previewProposal.id}
                    onClick={() => {
                      sendProposal(previewProposal.id, previewProposal.enquiry_id);
                      setPreviewProposal(null);
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />Send to Client Now
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════
          CREATE PROPOSAL DIALOG
      ══════════════════════════════════════════ */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) resetForm(); setShowCreate(o); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Create Proposal</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-1">

            {/* Step 1: Enquiry */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                1. Select Enquiry <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedEnquiryId} onValueChange={handleEnquirySelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an enquiry to create proposal for…" />
                </SelectTrigger>
                <SelectContent>
                  {enquiries.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">{e.event_type}</span>
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-xs text-muted-foreground">{e.client?.name}</span>
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-xs text-muted-foreground">{e.city}</span>
                        <span className="text-muted-foreground text-xs">·</span>
                        <span className="text-xs text-muted-foreground">{formatDate(e.event_date)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Budget & event info card */}
              <AnimatePresence>
                {selectedEnquiry && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2"
                  >
                    {[
                      { label: "Event", value: selectedEnquiry.event_type, icon: Mic2 },
                      { label: "Date", value: formatDate(selectedEnquiry.event_date), icon: Calendar },
                      { label: "City", value: selectedEnquiry.city, icon: MapPin },
                      { label: "Client Budget", value: `${formatCurrency(selectedEnquiry.budget_min)} – ${formatCurrency(selectedEnquiry.budget_max)}`, icon: IndianRupee },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Icon className="w-3 h-3 text-indigo-400" />
                          <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wide">{label}</p>
                        </div>
                        <p className="text-xs font-bold text-indigo-800 truncate">{value}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step 2: Artists from DB */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  2. Select Artists <span className="text-destructive">*</span>
                  {selectedEnquiry && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (showing artists available in {selectedEnquiry.city})
                    </span>
                  )}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{selectedArtists.length}/{MAX_ARTISTS}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addArtistSlot}
                    disabled={selectedArtists.length >= MAX_ARTISTS}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />Add Option
                  </Button>
                </div>
              </div>

              {selectedArtists.map((slot, i) => {
                const pickedArtist = artists.find((a) => a.id === slot.artistId);
                const withinBudget = selectedEnquiry && slot.price > 0
                  ? slot.price <= selectedEnquiry.budget_max
                  : null;

                return (
                  <div key={i} className="rounded-2xl border p-4 space-y-3 relative bg-card">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Option {i + 1}
                      </p>
                      {selectedArtists.length > 1 && (
                        <button onClick={() => removeArtistSlot(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Artist dropdown */}
                    <div className="space-y-1">
                      <Label className="text-xs">Artist from Database</Label>
                      <Select value={slot.artistId} onValueChange={(v) => updateSelectedArtist(i, v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Search and pick an artist…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {suggestedArtists.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                  {(a.user?.name ?? "A")[0]}
                                </div>
                                <span className="font-medium text-sm">{a.user?.name}</span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground">{a.categories.slice(0, 2).join(", ")}</span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="flex items-center gap-0.5 text-xs text-amber-600">
                                  <Star className="w-3 h-3 fill-amber-400" />{a.rating.toFixed(1)}
                                </span>
                                <span className="text-xs font-semibold text-indigo-600">{formatCurrency(a.base_price)}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Artist info pill */}
                    {pickedArtist && (
                      <div className="flex flex-wrap gap-2">
                        {pickedArtist.categories.slice(0, 3).map((c) => (
                          <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                        ))}
                        {pickedArtist.user?.phone && (
                          <a href={`tel:${pickedArtist.user.phone}`} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                            <Phone className="w-3 h-3" />{pickedArtist.user.phone}
                          </a>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />Verified · {pickedArtist.total_bookings} bookings
                        </span>
                        {conflictMap[slot.artistId] === true && (
                          <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            ⚠️ Already booked on this date
                          </span>
                        )}
                        {conflictMap[slot.artistId] === false && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            ✓ Available on event date
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {/* Quoted price — pre-filled from base_price, editable */}
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          Quoted Price (₹)
                          {withinBudget === true && (
                            <span className="text-[10px] text-emerald-600 font-semibold">· Within budget</span>
                          )}
                          {withinBudget === false && (
                            <span className="text-[10px] text-red-500 font-semibold">· Over budget</span>
                          )}
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                            type="number"
                            className="pl-8"
                            value={slot.price || ""}
                            onChange={(e) => updateArtistField(i, "price", Number(e.target.value))}
                            placeholder={pickedArtist ? String(pickedArtist.base_price) : "0"}
                          />
                        </div>
                        {selectedEnquiry && (
                          <p className="text-[10px] text-muted-foreground">
                            Client budget: {formatCurrency(selectedEnquiry.budget_min)}–{formatCurrency(selectedEnquiry.budget_max)}
                          </p>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="space-y-1">
                        <Label className="text-xs">Notes for Client</Label>
                        <Input
                          placeholder="e.g. 2-hour set, includes sound system"
                          value={slot.notes}
                          onChange={(e) => updateArtistField(i, "notes", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Total quoted */}
              {totalQuoted > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-sm">
                  <span className="text-indigo-600 font-medium">Highest quote (shown to client)</span>
                  <span className="font-bold text-indigo-800">{formatCurrency(totalQuoted)}</span>
                </div>
              )}
            </div>

            {/* Step 3: Message to client */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                3. Message to Client <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Describe the proposal, terms, and anything the client should know…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Step 4: Validity */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">4. Valid Until</Label>
              <div className="flex gap-2 flex-wrap">
                {[3, 7, 14].map((d) => (
                  <button
                    key={d}
                    onClick={() => setValidityDate(addDays(d))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      validityDate === addDays(d)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-background border-border text-muted-foreground hover:border-indigo-400"
                    }`}
                  >
                    {d} days
                  </button>
                ))}
                <Input
                  type="date"
                  value={validityDate}
                  onChange={(e) => setValidityDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-auto text-xs h-8"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => { resetForm(); setShowCreate(false); }}>Cancel</Button>
              <Button onClick={createProposal} loading={creating}>
                Save as Draft
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════
          CREATE BOOKING DIALOG
      ══════════════════════════════════════════ */}
      <Dialog open={!!showBooking} onOpenChange={(o) => { if (!o) { setShowBooking(null); setSelectedBookingArtistId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Create Booking</DialogTitle>
          </DialogHeader>
          {showBooking && (
            <div className="space-y-4 mt-2">
              {/* Event summary */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Event", value: showBooking.enquiry?.event_type },
                  { label: "Client", value: showBooking.enquiry?.client?.name },
                  { label: "Date", value: formatDate(showBooking.enquiry?.event_date ?? "") },
                  { label: "City", value: showBooking.enquiry?.city },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2.5 rounded-xl bg-muted/30 border">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">{label}</p>
                    <p className="text-sm font-semibold mt-0.5 truncate">{value ?? "—"}</p>
                  </div>
                ))}
              </div>

              {/* Artist selection — pick which proposed artist is confirmed */}
              {showBooking && (showBooking.artists_proposed as any[])?.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Confirmed Artist <span className="text-destructive">*</span></Label>
                  {/* Client's choice indicator */}
                  {(showBooking as any).client_chosen_artist_id && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      Client chose:{" "}
                      <span className="font-bold">
                        {(showBooking.artists_proposed as any[]).find((a: any) => a.artist_id === (showBooking as any).client_chosen_artist_id)?.name ?? "Selected artist"}
                      </span>
                      {" "}— pre-filled below
                    </div>
                  )}
                  <Select value={selectedBookingArtistId} onValueChange={(v) => {
                    setSelectedBookingArtistId(v);
                    // Update price to match selected artist
                    const artist = (showBooking.artists_proposed as any[]).find((a: any) => a.artist_id === v);
                    if (artist?.quoted_price) {
                      setTotalAmount(String(artist.quoted_price));
                      setAdvanceAmount(String(Math.round(artist.quoted_price * 0.3)));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select the artist being booked…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(showBooking.artists_proposed as any[]).map((a: any) => (
                        <SelectItem key={a.artist_id} value={a.artist_id}>
                          <div className="flex items-center gap-2">
                            <Mic2 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium">{a.name}</span>
                            {a.artist_id === (showBooking as any).client_chosen_artist_id && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">Client's choice</span>
                            )}
                            <span className="text-muted-foreground text-xs">·</span>
                            <span className="text-xs font-semibold text-indigo-600">{formatCurrency(a.quoted_price)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">The artist will receive a notification and must accept this booking.</p>
                </div>
              )}

              {/* Venue */}
              <div className="space-y-1.5">
                <Label>Venue / Hall Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Taj Palace Banquet Hall" value={venue} onChange={(e) => setVenue(e.target.value)} />
              </div>

              {/* City dropdown */}
              <div className="space-y-1.5">
                <Label>City <span className="text-destructive">*</span></Label>
                {cityList.length > 0 ? (
                  <Select value={bookingCity} onValueChange={setBookingCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select city…" />
                    </SelectTrigger>
                    <SelectContent>
                      {cityList.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder="e.g. Mumbai" value={bookingCity} onChange={(e) => setBookingCity(e.target.value)} />
                )}
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Total Amount (₹) <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input type="number" className="pl-8" value={totalAmount}
                      onChange={(e) => {
                        setTotalAmount(e.target.value);
                        setAdvanceAmount(String(Math.round(Number(e.target.value) * 0.3)));
                      }} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Advance (₹) <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input type="number" className="pl-8" value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)} />
                  </div>
                  {totalAmount && (
                    <div className="flex gap-1.5">
                      {[25, 30, 40, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setAdvanceAmount(String(Math.round(Number(totalAmount) * pct / 100)))}
                          className="text-[10px] px-2 py-0.5 rounded border bg-muted hover:bg-indigo-50 hover:border-indigo-300 text-muted-foreground hover:text-indigo-700 transition-colors"
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {totalAmount && advanceAmount && (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-sm">
                  <span className="text-emerald-700 font-medium">Balance due on event day</span>
                  <span className="font-bold text-emerald-800">
                    {formatCurrency(Number(totalAmount) - Number(advanceAmount))}
                  </span>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setShowBooking(null)}>Cancel</Button>
                <Button onClick={() => createBooking(showBooking!)} loading={creatingBooking}>
                  <Building2 className="w-4 h-4 mr-2" />Confirm Booking
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
