"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Star, Calendar, MapPin, CheckCircle2, MessageSquare,
  IndianRupee, PartyPopper, Clock, XCircle, ChevronRight,
  Phone, Mic2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Booking } from "@/types";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface BookingWithExtras extends Omit<Booking, "enquiry" | "artist"> {
  artist?: { user: { name: string; phone?: string; avatar_url?: string }; categories: string[] };
  enquiry?: { event_type: string };
  feedback?: { rating: number; comment: string }[];
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function CountdownBadge({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr);
  if (days < 0) return null;
  if (days === 0) return (
    <div className="flex flex-col items-center px-4 py-3 rounded-xl bg-red-100 flex-shrink-0">
      <PartyPopper className="w-5 h-5 text-red-600 mb-0.5" />
      <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Today!</p>
    </div>
  );
  return (
    <div className={`flex flex-col items-center px-4 py-3 rounded-xl flex-shrink-0 ${
      days <= 7 ? "bg-amber-100" : "bg-blue-50"
    }`}>
      <p className={`text-3xl font-display font-bold leading-none ${days <= 7 ? "text-amber-700" : "text-blue-700"}`}>{days}</p>
      <p className={`text-[10px] font-semibold mt-0.5 ${days <= 7 ? "text-amber-500" : "text-blue-500"}`}>
        {days === 1 ? "day left" : "days left"}
      </p>
    </div>
  );
}

export function ClientEventsClient({ bookings, clientId }: { bookings: BookingWithExtras[]; clientId: string }) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithExtras | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const upcoming  = bookings.filter((b) => b.event_date >= today && b.status !== "cancelled");
  const past      = bookings.filter((b) => b.event_date < today || b.status === "completed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  const submitFeedback = async () => {
    if (!selectedBooking) return;
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from("feedback").insert({ booking_id: selectedBooking.id, client_id: clientId, rating, comment });
    toast.success("Thank you for your review!");
    setFeedbackOpen(false);
    setComment(""); setRating(5); setHoverRating(0);
    router.refresh();
    setSubmitting(false);
  };

  const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent!"];

  const UpcomingCard = ({ booking, i }: { booking: BookingWithExtras; i: number }) => {
    const days = daysUntil(booking.event_date);
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.08 }}
        className={`rounded-2xl border overflow-hidden hover:shadow-lg transition-all ${
          days <= 7 ? "border-amber-200" : ""
        }`}
      >
        {days <= 7 && days >= 0 && <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />}

        <div className="p-5 flex gap-5 items-start">
          <CountdownBadge dateStr={booking.event_date} />

          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-base">{booking.enquiry?.event_type ?? "Event"}</h3>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(booking.event_date)}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{booking.venue}, {booking.city}</span>
              <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{formatCurrency(booking.total_amount)}</span>
            </div>

            {booking.artist?.user ? (
              <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center text-navy-900 font-bold text-sm flex-shrink-0">
                    {getInitials(booking.artist.user.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm">{booking.artist.user.name}</p>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="text-xs text-muted-foreground">{booking.artist.categories[0]}</p>
                  </div>
                </div>
                {booking.artist.user.phone && (
                  <a href={`tel:${booking.artist.user.phone}`}>
                    <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs h-8">
                      <Phone className="w-3.5 h-3.5 mr-1.5" />Call Artist
                    </Button>
                  </a>
                )}
              </div>
            ) : (
              <div className="mt-4 p-3 rounded-xl bg-muted/30 border flex items-center gap-2 text-sm text-muted-foreground">
                <Mic2 className="w-4 h-4" />Artist will be confirmed soon
              </div>
            )}

            {days <= 3 && days >= 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
                <PartyPopper className="w-3.5 h-3.5 flex-shrink-0" />
                {days === 0 ? "Your event is TODAY! Wishing you an amazing celebration." : `Only ${days} day${days === 1 ? "" : "s"} to go! Confirm final arrangements with your coordinator.`}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const PastCard = ({ booking, i }: { booking: BookingWithExtras; i: number }) => {
    const hasFeedback = (booking.feedback ?? []).length > 0;
    const existingRating = booking.feedback?.[0]?.rating;
    const isCompleted = booking.status === "completed";

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className="rounded-2xl border hover:shadow-md transition-all overflow-hidden"
      >
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-sm">{booking.enquiry?.event_type ?? "Event"}</h3>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(booking.event_date)}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{booking.venue}, {booking.city}</span>
            </div>
          </div>
          <p className="font-bold text-sm">{formatCurrency(booking.total_amount)}</p>
        </div>

        <div className="p-4 flex items-center justify-between flex-wrap gap-3">
          {booking.artist?.user ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center text-navy-900 font-bold text-xs">
                {getInitials(booking.artist.user.name)}
              </div>
              <div>
                <p className="font-medium text-sm">{booking.artist.user.name}</p>
                <p className="text-xs text-muted-foreground">{booking.artist.categories[0]}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}

          <div className="flex items-center gap-2">
            {hasFeedback ? (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < (existingRating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <span className="text-xs text-amber-700 font-medium">Your review</span>
              </div>
            ) : isCompleted ? (
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs"
                onClick={() => { setSelectedBooking(booking); setFeedbackOpen(true); }}
              >
                <Star className="w-3.5 h-3.5 mr-1.5" />Leave a Review
              </Button>
            ) : null}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Tabs defaultValue="upcoming">
        <TabsList className="w-full grid grid-cols-3 mb-6">
          <TabsTrigger value="upcoming" className="text-sm">
            Upcoming {upcoming.length > 0 && <span className="ml-1.5 px-1.5 py-0 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-bold">{upcoming.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="past">
            Past {past.length > 0 && <span className="ml-1.5 px-1.5 py-0 rounded-full text-[10px] bg-muted text-muted-foreground font-medium">{past.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcoming.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border-2 border-dashed border-muted">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="font-semibold mb-1">No upcoming events</p>
              <p className="text-sm text-muted-foreground mb-4">Submit an enquiry to start planning</p>
              <Link href="/enquiry">
                <Button size="sm">Plan an Event</Button>
              </Link>
            </div>
          ) : (
            upcoming.map((b, i) => <UpcomingCard key={b.id} booking={b} i={i} />)
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {past.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />No past events yet
            </div>
          ) : (
            past.map((b, i) => <PastCard key={b.id} booking={b} i={i} />)
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-3">
          {cancelled.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <XCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />No cancelled events
            </div>
          ) : (
            cancelled.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl border border-red-100 bg-red-50/30 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-sm">{b.enquiry?.event_type ?? "Event"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(b.event_date)} · {b.city}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Cancelled</span>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">How was your experience?</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Rate your experience for <span className="font-semibold text-foreground">{selectedBooking?.enquiry?.event_type}</span>
              </p>
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRating(r)}
                    onMouseEnter={() => setHoverRating(r)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star className={`w-10 h-10 transition-colors ${
                      r <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                    }`} />
                  </button>
                ))}
              </div>
              {(hoverRating || rating) > 0 && (
                <p className="text-sm font-semibold text-amber-600 mt-2">
                  {RATING_LABELS[hoverRating || rating]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tell us more (optional)</label>
              <Textarea
                placeholder="How was the artist's performance? Was the coordination smooth? Any suggestions for us?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Skip</Button>
              <Button
                onClick={submitFeedback}
                loading={submitting}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                <Star className="w-4 h-4 mr-2" />Submit Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
