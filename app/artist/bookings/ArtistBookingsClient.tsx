"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, User, IndianRupee } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Booking } from "@/types";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";

interface BookingWithExtras extends Omit<Booking, "enquiry" | "artist"> {
  enquiry?: {
    event_type: string;
    client?: { name: string; phone: string };
  };
}

export function ArtistBookingsClient({ bookings }: { bookings: BookingWithExtras[] }) {
  const today = new Date().toISOString().split("T")[0];
  const upcoming = bookings.filter((b) => b.event_date >= today && b.status !== "cancelled");
  const past = bookings.filter((b) => b.event_date < today || b.status === "completed");

  const BookingCard = ({ b }: { b: BookingWithExtras }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-4 hover:shadow-md transition-all"
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
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(b.event_date)}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {b.venue}, {b.city}
            </div>
            {b.enquiry?.client && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {b.enquiry.client.name} · {b.enquiry.client.phone}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <IndianRupee className="w-4 h-4 text-gold-600" />
            <span className="font-display font-bold text-lg">{formatCurrency(b.total_amount).replace("₹", "")}</span>
          </div>
          <p className="text-xs text-muted-foreground">Advance: {formatCurrency(b.advance_amount)}</p>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="p-4 md:p-6">
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {upcoming.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">No upcoming bookings</p>
          ) : (
            upcoming.map((b) => <BookingCard key={b.id} b={b} />)
          )}
        </TabsContent>
        <TabsContent value="past" className="mt-6 space-y-4">
          {past.map((b) => <BookingCard key={b.id} b={b} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
