"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, User, IndianRupee, CheckCircle, XCircle, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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

export function ArtistBookingsClient({ bookings }: { bookings: BookingWithExtras[] }) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  const pending = bookings.filter((b) => b.status === "pending");
  const upcoming = bookings.filter((b) => b.status !== "pending" && b.event_date >= today && b.status !== "cancelled");
  const past = bookings.filter((b) => b.event_date < today || b.status === "completed");

  const updateBooking = async (id: string, status: "confirmed" | "cancelled") => {
    setUpdating(id);
    const supabase = createClient();
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) {
      toast.error("Failed to update booking");
    } else {
      toast.success(status === "confirmed" ? "Booking confirmed!" : "Booking declined");
      router.refresh();
    }
    setUpdating(null);
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
        <div className="mt-4 flex gap-3 pt-3 border-t border-amber-200">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            loading={updating === b.id}
            onClick={() => updateBooking(b.id, "cancelled")}
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
