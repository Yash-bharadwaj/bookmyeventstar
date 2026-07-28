"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Calendar, MapPin, ChevronRight, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { summarizePayments } from "@/lib/payments";

interface Booking {
  id: string;
  event_type: string;
  client_name: string;
  artist_name: string;
  city: string;
  event_date: string;
  status: string;
  total_amount: number;
  payments: { type: "advance" | "final" | "artist_settlement"; amount: number; status: "pending" | "paid" | "failed" }[];
}

export function AdminBookingsClient({ bookings }: { bookings: Booking[] }) {
  const [search, setSearch] = useState("");

  const filtered = bookings.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [b.event_type, b.client_name, b.artist_name, b.city].some((v) => v.toLowerCase().includes(q));
  });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-xl font-bold text-navy-900">Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">Every confirmed booking, with what's been paid and what's still pending.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by event, client, artist, or city…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm border rounded-2xl">
          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No bookings found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b, i) => {
            const summary = summarizePayments(b.total_amount, b.payments);
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Link
                  href={`/admin/bookings/${b.id}`}
                  className="flex items-center justify-between gap-4 p-4 rounded-2xl border hover:border-navy-300 hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-navy-900 truncate">{b.event_type}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(b.status)}`}>
                        {getStatusLabel(b.status)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.client_name} · Artist: {b.artist_name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.city}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(b.event_date)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Total {formatCurrency(b.total_amount)}</p>
                    <p className="text-sm font-semibold text-emerald-700">{formatCurrency(summary.paidTotal)} paid</p>
                    <p className={`text-xs font-medium ${summary.pendingBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {formatCurrency(summary.pendingBalance)} pending
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
