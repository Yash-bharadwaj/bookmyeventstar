"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Send, X, IndianRupee, Calendar, MapPin,
  Mic2, ChevronDown, ChevronUp, Building2, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Proposal } from "@/types";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface ProposalWithExtras extends Omit<Proposal, "enquiry"> {
  enquiry?: {
    event_type: string;
    event_date: string;
    city: string;
    client?: { name: string };
  };
}

interface EnquiryOption {
  id: string;
  event_type: string;
  event_date: string;
  city: string;
  client?: { name: string } | null;
}

interface ArtistOption {
  name: string;
  price: string;
  notes: string;
}

interface Props {
  proposals: ProposalWithExtras[];
  coordinatorId: string;
  enquiries: EnquiryOption[];
}

export function CoordinatorProposalsClient({ proposals, coordinatorId, enquiries }: Props) {
  const router = useRouter();
  const [sending, setSending] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showBooking, setShowBooking] = useState<ProposalWithExtras | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);

  // Proposal creation form state
  const [selectedEnquiry, setSelectedEnquiry] = useState("");
  const [content, setContent] = useState("");
  const [validityDate, setValidityDate] = useState("");
  const [artistOptions, setArtistOptions] = useState<ArtistOption[]>([
    { name: "", price: "", notes: "" },
  ]);

  // Booking creation form state
  const [venue, setVenue] = useState("");
  const [bookingCity, setBookingCity] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");

  const sendProposal = async (proposalId: string, enquiryId: string) => {
    setSending(proposalId);
    const supabase = createClient();
    await supabase.from("proposals").update({ status: "sent" }).eq("id", proposalId);
    await supabase.from("enquiries").update({ status: "proposal_sent" }).eq("id", enquiryId);
    const { data: enq } = await supabase
      .from("enquiries").select("client_id, event_type").eq("id", enquiryId).single();
    if (enq?.client_id) {
      await supabase.from("notifications").insert({
        user_id: enq.client_id,
        title: "Proposal Ready for Review",
        message: `Your proposal for ${enq.event_type} is ready. Please review the artist options.`,
        type: "success",
        link: "/client/proposals",
      });
    }
    toast.success("Proposal sent to client!");
    setSending(null);
    router.refresh();
  };

  const addArtistOption = () =>
    setArtistOptions((prev) => [...prev, { name: "", price: "", notes: "" }]);

  const removeArtistOption = (i: number) =>
    setArtistOptions((prev) => prev.filter((_, idx) => idx !== i));

  const updateArtist = (i: number, field: keyof ArtistOption, value: string) =>
    setArtistOptions((prev) => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));

  const createProposal = async () => {
    if (!selectedEnquiry || !content || !validityDate) {
      toast.error("Please fill all required fields");
      return;
    }
    const filledArtists = artistOptions.filter((a) => a.name && a.price);
    if (filledArtists.length === 0) {
      toast.error("Add at least one artist option");
      return;
    }
    setCreating(true);
    try {
      const supabase = createClient();
      const maxPrice = Math.max(...filledArtists.map((a) => Number(a.price)));
      const artistsProposed = filledArtists.map((a) => ({
        name: a.name,
        quoted_price: Number(a.price),
        notes: a.notes,
      }));
      const { error } = await supabase.from("proposals").insert({
        enquiry_id: selectedEnquiry,
        coordinator_id: coordinatorId,
        content,
        artists_proposed: artistsProposed,
        quoted_price: maxPrice,
        validity_date: validityDate,
        status: "draft",
      });
      if (error) throw error;
      await supabase.from("enquiries")
        .update({ status: "proposal_sent" })
        .eq("id", selectedEnquiry);
      toast.success("Proposal created as draft!");
      setShowCreate(false);
      setSelectedEnquiry(""); setContent(""); setValidityDate("");
      setArtistOptions([{ name: "", price: "", notes: "" }]);
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
    setCreatingBooking(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("bookings").insert({
        enquiry_id: proposal.enquiry_id,
        coordinator_id: coordinatorId,
        event_date: proposal.enquiry?.event_date,
        venue,
        city: bookingCity,
        total_amount: Number(totalAmount),
        advance_amount: Number(advanceAmount),
        status: "pending",
        special_requirements: proposal.content,
      });
      if (error) throw error;
      await supabase.from("enquiries")
        .update({ status: "confirmed" })
        .eq("id", proposal.enquiry_id);
      const { data: enq } = await supabase
        .from("enquiries").select("client_id, event_type").eq("id", proposal.enquiry_id).single();
      if (enq?.client_id) {
        await supabase.from("notifications").insert({
          user_id: enq.client_id,
          title: "Booking Confirmed!",
          message: `Your ${enq.event_type} booking has been created. Artist confirmation pending.`,
          type: "success",
          link: "/client/events",
        });
      }
      toast.success("Booking created! Awaiting artist confirmation.");
      setShowBooking(null);
      setVenue(""); setBookingCity(""); setTotalAmount(""); setAdvanceAmount("");
      router.refresh();
    } catch {
      toast.error("Failed to create booking");
    } finally {
      setCreatingBooking(false);
    }
  };

  const drafts = proposals.filter((p) => p.status === "draft");
  const sent = proposals.filter((p) => p.status === "sent");
  const accepted = proposals.filter((p) => p.status === "accepted");

  const ProposalCard = ({ p }: { p: ProposalWithExtras }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden hover:shadow-md transition-all"
    >
      <div className="p-4 border-b bg-muted/20 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{p.enquiry?.event_type ?? "Event"}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(p.status)}`}>
              {getStatusLabel(p.status)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {p.enquiry?.client?.name} · {p.enquiry?.city} · {formatDate(p.enquiry?.event_date ?? "")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-bold">{formatCurrency(p.quoted_price)}</p>
          {p.status === "draft" && (
            <Button size="sm" loading={sending === p.id} onClick={() => sendProposal(p.id, p.enquiry_id)}>
              <Send className="w-3.5 h-3.5 mr-1.5" />Send
            </Button>
          )}
          {p.status === "accepted" && (
            <Button size="sm" variant="outline" onClick={() => {
              setShowBooking(p);
              setBookingCity(p.enquiry?.city ?? "");
            }}>
              <Building2 className="w-3.5 h-3.5 mr-1.5" />Create Booking
            </Button>
          )}
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{p.content || "No description added."}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Mic2 className="w-3 h-3" />
          <span>{((p.artists_proposed as unknown[]) ?? []).length} artist(s) proposed</span>
          {p.validity_date && <span>· Valid till {formatDate(p.validity_date)}</span>}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div />
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />New Proposal
        </Button>
      </div>

      <Tabs defaultValue="drafts">
        <TabsList>
          <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({accepted.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="drafts" className="mt-6 space-y-4">
          {drafts.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <Send className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No draft proposals. Create one to get started.</p>
            </div>
          ) : (
            drafts.map((p) => <ProposalCard key={p.id} p={p} />)
          )}
        </TabsContent>
        <TabsContent value="sent" className="mt-6 space-y-4">
          {sent.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">No sent proposals</p>
          ) : sent.map((p) => <ProposalCard key={p.id} p={p} />)}
        </TabsContent>
        <TabsContent value="accepted" className="mt-6 space-y-4">
          {accepted.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">No accepted proposals yet</p>
          ) : accepted.map((p) => <ProposalCard key={p.id} p={p} />)}
        </TabsContent>
      </Tabs>

      {/* ── Create Proposal Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Proposal</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="space-y-1.5">
              <Label>Select Enquiry <span className="text-destructive">*</span></Label>
              <Select value={selectedEnquiry} onValueChange={setSelectedEnquiry}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an enquiry..." />
                </SelectTrigger>
                <SelectContent>
                  {enquiries.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.event_type} — {e.client?.name ?? "Client"} · {e.city} · {formatDate(e.event_date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Proposal Description <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Describe the event, artist options, terms..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Valid Until <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Artist Options <span className="text-destructive">*</span></Label>
                <Button size="sm" variant="outline" onClick={addArtistOption}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add Artist
                </Button>
              </div>
              {artistOptions.map((artist, i) => (
                <div key={i} className="p-4 rounded-xl border space-y-3 relative">
                  {artistOptions.length > 1 && (
                    <button
                      onClick={() => removeArtistOption(i)}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Artist Name *</Label>
                      <Input
                        placeholder="e.g. Arijit Singh"
                        value={artist.name}
                        onChange={(e) => updateArtist(i, "name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quoted Price (₹) *</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 150000"
                        value={artist.price}
                        onChange={(e) => updateArtist(i, "price", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notes (optional)</Label>
                    <Input
                      placeholder="Availability, inclusions, special notes..."
                      value={artist.notes}
                      onChange={(e) => updateArtist(i, "notes", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createProposal} loading={creating}>
                Save as Draft
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create Booking Dialog ── */}
      <Dialog open={!!showBooking} onOpenChange={(o) => !o && setShowBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Booking</DialogTitle>
          </DialogHeader>
          {showBooking && (
            <div className="space-y-4 mt-2">
              <div className="p-3 rounded-xl bg-muted/50 text-sm space-y-1">
                <p><span className="font-medium">Event:</span> {showBooking.enquiry?.event_type}</p>
                <p><span className="font-medium">Client:</span> {showBooking.enquiry?.client?.name}</p>
                <p><span className="font-medium">Date:</span> {formatDate(showBooking.enquiry?.event_date ?? "")}</p>
              </div>

              <div className="space-y-1.5">
                <Label>Venue Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Taj Palace Banquet Hall" value={venue} onChange={(e) => setVenue(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>City <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Mumbai" value={bookingCity} onChange={(e) => setBookingCity(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Total Amount (₹) <span className="text-destructive">*</span></Label>
                  <Input type="number" placeholder="200000" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Advance Amount (₹) <span className="text-destructive">*</span></Label>
                  <Input type="number" placeholder="50000" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} />
                </div>
              </div>

              {totalAmount && advanceAmount && (
                <div className="p-3 rounded-xl bg-blue-50 text-sm text-blue-700">
                  Balance due: <span className="font-bold">{formatCurrency(Number(totalAmount) - Number(advanceAmount))}</span>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowBooking(null)}>Cancel</Button>
                <Button onClick={() => createBooking(showBooking!)} loading={creatingBooking}>
                  Create Booking
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
