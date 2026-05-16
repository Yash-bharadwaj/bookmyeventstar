"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Calendar, MapPin, CheckCircle2, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Booking } from "@/types";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel, getInitials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface BookingWithExtras extends Omit<Booking, "enquiry" | "artist"> {
  artist?: { user: { name: string; phone: string; avatar_url?: string }; categories: string[] };
  enquiry?: { event_type: string };
  feedback?: { rating: number; comment: string }[];
}

export function ClientEventsClient({
  bookings,
  clientId,
}: {
  bookings: BookingWithExtras[];
  clientId: string;
}) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithExtras | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const upcoming = bookings.filter((b) => b.event_date >= today && b.status !== "cancelled");
  const past = bookings.filter((b) => b.event_date < today || b.status === "completed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  const submitFeedback = async () => {
    if (!selectedBooking) return;
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from("feedback").insert({
      booking_id: selectedBooking.id,
      client_id: clientId,
      rating,
      comment,
    });
    toast.success("Thank you for your feedback!");
    setFeedbackOpen(false);
    setComment("");
    setRating(5);
    router.refresh();
    setSubmitting(false);
  };

  const EventCard = ({ booking }: { booking: BookingWithExtras }) => {
    const hasFeedback = (booking.feedback ?? []).length > 0;
    const isCompleted = booking.status === "completed";

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border overflow-hidden hover:shadow-md transition-all"
      >
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{booking.enquiry?.event_type ?? "Event"}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(booking.status)}`}>
                {getStatusLabel(booking.status)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(booking.event_date)}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{booking.venue}, {booking.city}</span>
            </div>
          </div>
          <p className="font-bold">{formatCurrency(booking.total_amount)}</p>
        </div>

        <div className="p-4 flex items-center justify-between flex-wrap gap-3">
          {booking.artist?.user ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-navy-900 font-bold text-sm">
                {getInitials(booking.artist.user.name)}
              </div>
              <div>
                <p className="font-medium text-sm">{booking.artist.user.name}</p>
                <p className="text-xs text-muted-foreground">{booking.artist.categories[0]}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Artist TBD</p>
          )}

          {isCompleted && !hasFeedback && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setSelectedBooking(booking); setFeedbackOpen(true); }}
            >
              <Star className="w-3.5 h-3.5 mr-1.5 text-gold-500" />
              Leave Review
            </Button>
          )}

          {hasFeedback && (
            <div className="flex items-center gap-1 text-sm">
              {Array.from({ length: booking.feedback![0].rating }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-gold-500 text-gold-500" />
              ))}
              <span className="text-xs text-muted-foreground ml-1">Your rating</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {upcoming.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">No upcoming events</p>
          ) : (
            upcoming.map((b) => <EventCard key={b.id} booking={b} />)
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-6 space-y-4">
          {past.map((b) => <EventCard key={b.id} booking={b} />)}
        </TabsContent>
        <TabsContent value="cancelled" className="mt-6 space-y-4">
          {cancelled.map((b) => <EventCard key={b.id} booking={b} />)}
        </TabsContent>
      </Tabs>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How was the experience?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Rating</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRating(r)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        r <= rating ? "fill-gold-500 text-gold-500" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Your Review (optional)</label>
              <Textarea
                placeholder="Tell us about your experience — the artist, coordination, overall event..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
              <Button onClick={submitFeedback} loading={submitting}>Submit Review</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
