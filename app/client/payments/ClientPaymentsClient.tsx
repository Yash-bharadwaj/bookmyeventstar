"use client";

import { motion } from "framer-motion";
import { IndianRupee, CheckCircle2, Clock, Calendar, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { Payment } from "@/types";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

interface Props {
  bookings: {
    id: string;
    total_amount: number;
    advance_amount: number;
    balance_amount: number;
    event_date: string;
    venue: string;
    city: string;
    status: string;
    enquiry?: { event_type: string } | null;
  }[];
  payments: Payment[];
}

export function ClientPaymentsClient({ bookings, payments }: Props) {
  const paidTotal = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pendingTotal = bookings.reduce((s, b) => s + b.balance_amount, 0);
  const totalBookings = bookings.reduce((s, b) => s + b.total_amount, 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard title="Total Paid" value={formatCurrency(paidTotal)} icon={CheckCircle2} color="green" index={0} />
        <StatCard title="Balance Due" value={formatCurrency(pendingTotal)} icon={Clock} color="gold" index={1} />
        <StatCard title="Total Bookings Value" value={formatCurrency(totalBookings)} icon={IndianRupee} color="blue" index={2} />
      </div>

      <Card>
        <CardHeader><CardTitle>Event-wise Payment Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {bookings.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No bookings yet</p>
          ) : (
            bookings.map((booking, i) => {
              const bookingPayments = payments.filter((p) => p.booking_id === booking.id);
              const advancePaid = bookingPayments.filter((p) => p.type === "advance" && p.status === "paid")
                .reduce((s, p) => s + p.amount, 0);

              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border overflow-hidden"
                >
                  <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{booking.enquiry?.event_type ?? "Event"}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.venue} · {booking.city} · {formatDate(booking.event_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                        <FileDown className="w-3 h-3 mr-1" />
                        Invoice
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Total</p>
                      <p className="font-bold mt-0.5">{formatCurrency(booking.total_amount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Advance Paid</p>
                      <p className="font-bold text-emerald-600 mt-0.5">{formatCurrency(booking.advance_amount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Balance Due</p>
                      <p className={`font-bold mt-0.5 ${booking.balance_amount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {formatCurrency(booking.balance_amount)}
                      </p>
                    </div>
                  </div>
                  {/* Payment progress */}
                  <div className="px-4 pb-4">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full gold-gradient rounded-full transition-all"
                        style={{
                          width: `${booking.total_amount ? (booking.advance_amount / booking.total_amount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {booking.total_amount
                        ? Math.round((booking.advance_amount / booking.total_amount) * 100)
                        : 0}% paid
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
