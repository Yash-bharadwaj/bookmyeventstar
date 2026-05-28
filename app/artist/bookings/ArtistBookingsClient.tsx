"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar, MapPin, User, IndianRupee, CheckCircle, XCircle, Clock,
  ClipboardList, Save,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Booking } from "@/types";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface BookingWithExtras extends Omit<Booking, "enquiry" | "artist"> {
  enquiry?: {
    event_type: string;
    client?: { name: string; phone: string };
  };
}

interface RequirementsForm {
  sound_system: string;
  accommodation: string;
  transport: string;
  hospitality: string;
  other: string;
}

export function ArtistBookingsClient({ bookings }: { bookings: BookingWithExtras[] }) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const [reqDialog, setReqDialog] = useState<BookingWithExtras | null>(null);
  const [reqForm, setReqForm] = useState<RequirementsForm>({
    sound_system: "", accommodation: "", transport: "", hospitality: "", other: "",
  });
  const [savingReq, setSavingReq] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const pending = bookings.filter((b) => b.status === "pending");
  const upcoming = bookings.filter((b) => b.status !== "pending" && b.event_date >= today && b.status !== "cancelled");
  const past = bookings.filter((b) => b.event_date < today || b.status === "completed");

  const openReqDialog = (booking: BookingWithExtras) => {
    // Parse existing requirements from special_requirements field
    try {
      const existing = booking.special_requirements ? JSON.parse(booking.special_requirements) : {};
      setReqForm({
        sound_system: existing.sound_system ?? "",
        accommodation: existing.accommodation ?? "",
        transport: existing.transport ?? "",
        hospitality: existing.hospitality ?? "",
        other: existing.other ?? "",
      });
    } catch {
      setReqForm({ sound_system: "", accommodation: "", transport: "", hospitality: "", other: "" });
    }
    setReqDialog(booking);
  };

  const saveRequirements = async () => {
    if (!reqDialog) return;
    setSavingReq(true);
    const supabase = createClient();
    const requirementsJson = JSON.stringify(reqForm);
    const { error } = await supabase
      .from("bookings")
      .update({ special_requirements: requirementsJson })
      .eq("id", reqDialog.id);
    if (error) toast.error("Failed to save requirements");
    else {
      toast.success("Performance requirements saved!");
      setReqDialog(null);
      router.refresh();
    }
    setSavingReq(false);
  };

  const [declineOpen, setDeclineOpen] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);

  const updateBooking = async (id: string, status: "confirmed" | "cancelled", reason?: string) => {
    setUpdating(id);
    const supabase = createClient();
    const updatePayload: Record<string, unknown> = { status };
    if (reason) updatePayload.cancellation_reason = reason;
    const { error } = await supabase.from("bookings").update(updatePayload).eq("id", id);
    if (error) {
      toast.error("Failed to update booking");
      setUpdating(null);
      return;
    }
    toast.success(status === "confirmed" ? "Booking accepted!" : "Booking declined");
    // Notify coordinator
    const { data: booking } = await supabase
      .from("bookings")
      .select("coordinator_id, enquiry:enquiries(event_type)")
      .eq("id", id)
      .single();
    if (booking?.coordinator_id) {
      const eventType = (booking.enquiry as any)?.event_type ?? "event";
      await supabase.from("notifications").insert({
        user_id: booking.coordinator_id,
        title: status === "confirmed" ? "Artist Confirmed Booking" : "Artist Declined Booking",
        message: `Artist has ${status === "confirmed" ? "accepted" : "declined"} the booking for ${eventType}${reason ? `: "${reason}"` : ""}. ${status === "cancelled" ? "Please propose a replacement artist." : ""}`,
        type: status === "confirmed" ? "success" : "warning",
        link: "/coordinator/bookings",
      });
    }
    router.refresh();
    setUpdating(null);
  };

  const confirmDecline = async () => {
    if (!declineOpen) return;
    if (!declineReason.trim()) { toast.error("Please provide a reason for declining"); return; }
    setDeclining(true);
    await updateBooking(declineOpen, "cancelled", declineReason.trim());
    setDeclineOpen(null);
    setDeclineReason("");
    setDeclining(false);
  };

  const BookingCard = ({ b, showActions }: { b: BookingWithExtras; showActions?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 hover:shadow-md transition-all ${showActions ? "border-amber-200 bg-amber-50/30" : ""}`}
    >
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{b.enquiry?.event_type ?? "Event"}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(b.status)}`}>
              {getStatusLabel(b.status)}
            </span>
          </div>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />{formatDate(b.event_date)}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />{b.venue}, {b.city}
            </div>
            {b.enquiry?.client && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />{b.enquiry.client.name} · {b.enquiry.client.phone}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <IndianRupee className="w-4 h-4 text-amber-600" />
            <span className="font-display font-bold text-lg">{formatCurrency(b.total_amount).replace("₹", "")}</span>
          </div>
          <p className="text-xs text-muted-foreground">Advance: {formatCurrency(b.advance_amount)}</p>
        </div>
      </div>

      {showActions && (
        <>
          {/* Urgency indicator */}
          {b.created_at && (() => {
            const hoursElapsed = (Date.now() - new Date(b.created_at).getTime()) / 3_600_000;
            const hoursLeft = Math.max(0, 48 - hoursElapsed);
            const isUrgent = hoursLeft < 12;
            return (
              <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                isUrgent ? "bg-red-50 text-red-700 border border-red-200" : "bg-amber-50 text-amber-700 border border-amber-100"
              }`}>
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {hoursLeft <= 0
                  ? "This request has expired — client will be notified."
                  : isUrgent
                  ? `⚡ Respond within ${Math.ceil(hoursLeft)} hours — this request expires soon!`
                  : `Please respond within ${Math.ceil(hoursLeft)} hours`}
              </div>
            );
          })()}
          <div className="mt-3 flex gap-3 pt-3 border-t border-amber-200">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              disabled={updating === b.id}
              onClick={() => { setDeclineOpen(b.id); setDeclineReason(""); }}
            >
              <XCircle className="w-4 h-4 mr-1.5" />Decline
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              loading={updating === b.id}
              onClick={() => updateBooking(b.id, "confirmed")}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />Accept
            </Button>
          </div>
        </>
      )}

      {(b.status === "confirmed" || b.status === "in_progress") && (
        <div className="mt-3 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => openReqDialog(b)}
          >
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
            {b.special_requirements ? "Update Performance Requirements" : "Submit Performance Requirements"}
          </Button>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="p-4 md:p-6">
      <Tabs defaultValue={pending.length > 0 ? "requests" : "upcoming"}>
        <TabsList>
          <TabsTrigger value="requests" className="relative">
            Requests ({pending.length})
            {pending.length > 0 && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-amber-500 inline-block" />
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-6 space-y-4">
          {pending.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No pending booking requests</p>
            </div>
          ) : (
            pending.map((b) => <BookingCard key={b.id} b={b} showActions />)
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {upcoming.length === 0 ? (
            <div className="py-14 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-semibold text-sm">No upcoming bookings</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Your confirmed events will appear here.</p>
            </div>
          ) : (
            upcoming.map((b) => <BookingCard key={b.id} b={b} />)
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6 space-y-4">
          {past.length === 0 ? (
            <div className="py-14 text-center">
              <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-semibold text-sm">No past bookings yet</p>
              <p className="text-xs text-muted-foreground mt-1">Completed events will appear here.</p>
            </div>
          ) : (
            past.map((b) => <BookingCard key={b.id} b={b} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Performance Requirements Dialog */}
      <Dialog open={!!reqDialog} onOpenChange={(o) => !o && setReqDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Performance Requirements</DialogTitle>
          </DialogHeader>
          {reqDialog && (
            <div className="space-y-4 mt-2">
              <div className="p-3 rounded-xl bg-muted/40 text-sm">
                <p><span className="font-medium">Event:</span> {reqDialog.enquiry?.event_type}</p>
                <p><span className="font-medium">Date:</span> {formatDate(reqDialog.event_date)}</p>
                <p><span className="font-medium">Venue:</span> {reqDialog.venue}, {reqDialog.city}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Specify your technical and hospitality requirements for this event. These will be shared with the coordinator.
              </p>

              {[
                { key: "sound_system" as const, label: "Sound System Requirements", placeholder: "e.g. 2x JBL speakers, wireless mic, monitor, soundcheck 2hrs before..." },
                { key: "accommodation" as const, label: "Accommodation", placeholder: "e.g. 1 AC room for 1 night, check-in day before event..." },
                { key: "transport" as const, label: "Travel / Transport", placeholder: "e.g. Flight from Mumbai, cab pickup from airport..." },
                { key: "hospitality" as const, label: "Food & Hospitality", placeholder: "e.g. Vegetarian food, mineral water, green room..." },
                { key: "other" as const, label: "Other Requirements", placeholder: "Any other specific needs or notes..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm">{label}</Label>
                  <Textarea
                    placeholder={placeholder}
                    value={reqForm[key]}
                    onChange={(e) => setReqForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="min-h-[70px] text-sm"
                  />
                </div>
              ))}

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setReqDialog(null)}>Cancel</Button>
                <Button onClick={saveRequirements} loading={savingReq}>
                  <Save className="w-4 h-4 mr-2" />Save Requirements
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Decline reason dialog */}
      <Dialog open={!!declineOpen} onOpenChange={(o) => { if (!o) setDeclineOpen(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Decline Booking</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Please let the coordinator know why — they need to find an alternative artist quickly.
            </p>
            <Textarea
              placeholder="e.g. Already have a booking on this date / Not available in this city / Budget too low"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeclineOpen(null)}>Back</Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={!declineReason.trim() || declining}
                onClick={confirmDecline}
              >
                {declining ? "Declining…" : "Confirm Decline"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
