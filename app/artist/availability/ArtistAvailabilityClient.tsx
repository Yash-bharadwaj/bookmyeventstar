"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isToday,
  isBefore,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, CalendarDays, Loader2,
  CheckCircle2, XCircle, Ban, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Availability, AvailabilityStatus } from "@/types";
import { db } from "@/lib/firebase/client";
import { doc, deleteDoc, setDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Props {
  artistProfileId: string;
  availability: Availability[];
  /** event_date strings of the artist's own non-cancelled bookings — always
   * shown as "booked" and locked from editing here, regardless of whatever
   * they last self-set that date to. */
  bookedDates: string[];
}

type BulkStatus = "available" | "blocked" | "clear";

export function ArtistAvailabilityClient({ artistProfileId, availability, bookedDates }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availMap, setAvailMap] = useState<Map<string, AvailabilityStatus>>(
    new Map(availability.map((a) => [a.date, a.status]))
  );
  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates]);
  const [saving, setSaving] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState<BulkStatus | null>(null);
  const [activeDay, setActiveDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const today = new Date();

  const futureDaysInMonth = () =>
    days.filter((d) => (!isBefore(d, today) || isToday(d)) && !bookedSet.has(format(d, "yyyy-MM-dd")));

  const setDayStatus = async (dateStr: string, status: AvailabilityStatus | "clear") => {
    setSaving(dateStr);
    try {
      // Doc ID IS the "YYYY-MM-DD" date string per the schema — no
      // artist_id/date composite key needed, unlike the old Postgres table.
      const ref = doc(db, "artistProfiles", artistProfileId, "availability", dateStr);
      if (status === "clear") {
        await deleteDoc(ref);
        setAvailMap((prev) => {
          const next = new Map(prev);
          next.delete(dateStr);
          return next;
        });
      } else {
        await setDoc(ref, { status, created_at: serverTimestamp() }, { merge: true });
        setAvailMap((prev) => {
          const next = new Map(prev);
          next.set(dateStr, status);
          return next;
        });
      }
    } catch {
      toast.error("Failed to update availability");
    } finally {
      setSaving(null);
    }
  };

  const handleDayClick = (day: Date) => {
    const isPast = isBefore(day, today) && !isToday(day);
    if (isPast) return;
    const dateStr = format(day, "yyyy-MM-dd");
    if (bookedSet.has(dateStr)) {
      toast("This date has a confirmed booking — it can't be changed here.", { icon: "ℹ️" });
      return;
    }
    setActiveDay(day);
  };

  const handlePickStatus = async (status: AvailabilityStatus | "clear") => {
    if (!activeDay) return;
    const dateStr = format(activeDay, "yyyy-MM-dd");
    setActiveDay(null);
    await setDayStatus(dateStr, status);
  };

  const handleBulkAction = async (status: BulkStatus) => {
    const targets = futureDaysInMonth();
    if (targets.length === 0) {
      toast("No future dates to update this month", { icon: "ℹ️" });
      return;
    }

    setBulkSaving(status);
    try {
      const dates = targets.map((d) => format(d, "yyyy-MM-dd"));
      const batch = writeBatch(db);

      if (status === "clear") {
        dates.forEach((date) => batch.delete(doc(db, "artistProfiles", artistProfileId, "availability", date)));
        await batch.commit();
        setAvailMap((prev) => {
          const next = new Map(prev);
          dates.forEach((d) => next.delete(d));
          return next;
        });
        toast.success(`Cleared ${dates.length} dates`);
      } else {
        dates.forEach((date) =>
          batch.set(
            doc(db, "artistProfiles", artistProfileId, "availability", date),
            { status, created_at: serverTimestamp() },
            { merge: true }
          )
        );
        await batch.commit();
        setAvailMap((prev) => {
          const next = new Map(prev);
          dates.forEach((d) => next.set(d, status));
          return next;
        });
        toast.success(`${dates.length} dates marked as ${status === "available" ? "Available" : "Blocked"}`);
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setBulkSaving(null);
    }
  };

  const activeDayStr = activeDay ? format(activeDay, "yyyy-MM-dd") : null;
  const activeDayStatus = activeDayStr ? availMap.get(activeDayStr) : undefined;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-gold-600" />
              {format(currentDate, "MMMM yyyy")}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground text-center -mt-1">Tap a date to set your availability</p>

          {/* Weekday headers */}
          <div className="grid grid-cols-7">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isBooked = bookedSet.has(dateStr);
              const status: AvailabilityStatus | undefined = isBooked ? "booked" : availMap.get(dateStr);
              const isPast = isBefore(day, today) && !isToday(day);
              const isSaving = saving === dateStr;

              return (
                <motion.button
                  key={dateStr}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleDayClick(day)}
                  disabled={isPast || isSaving || !!bulkSaving || isBooked}
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all relative",
                    isToday(day) && "ring-2 ring-gold-500",
                    isPast && "opacity-30 cursor-not-allowed",
                    !status && !isPast && "hover:bg-muted",
                    status === "available" && "bg-emerald-100 text-emerald-700",
                    status === "booked" && "bg-red-100 text-red-700 cursor-not-allowed",
                    status === "blocked" && "bg-gray-100 text-gray-500",
                    (isSaving || !!bulkSaving) && "opacity-50"
                  )}
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : day.getDate()}
                  {isBooked && !isSaving && (
                    <Lock className="w-2.5 h-2.5 absolute top-1 right-1 text-red-400" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Available</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400" />Blocked</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Booked</span>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions — one clean row instead of a wall of buttons */}
      <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/20 px-3 py-2.5 flex-wrap">
        <span className="text-xs text-muted-foreground shrink-0">This month:</span>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <button
            onClick={() => handleBulkAction("available")}
            disabled={!!bulkSaving}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 disabled:opacity-50 transition-colors"
          >
            {bulkSaving === "available" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Mark all available
          </button>
          <button
            onClick={() => handleBulkAction("blocked")}
            disabled={!!bulkSaving}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 text-xs font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {bulkSaving === "blocked" ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
            Block all
          </button>
          <button
            onClick={() => handleBulkAction("clear")}
            disabled={!!bulkSaving}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 text-xs font-medium hover:bg-rose-100 disabled:opacity-50 transition-colors"
          >
            {bulkSaving === "clear" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
            Clear
          </button>
        </div>
      </div>

      {/* Per-day status picker */}
      <Dialog open={!!activeDay} onOpenChange={(o) => !o && setActiveDay(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{activeDay ? format(activeDay, "EEEE, d MMMM") : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <button
              onClick={() => handlePickStatus("available")}
              className={cn(
                "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                activeDayStatus === "available" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-border hover:border-emerald-300"
              )}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Available
            </button>
            <button
              onClick={() => handlePickStatus("blocked")}
              className={cn(
                "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                activeDayStatus === "blocked" ? "border-gray-500 bg-gray-50 text-gray-700" : "border-border hover:border-gray-300"
              )}
            >
              <XCircle className="w-4 h-4 text-gray-500" />
              Blocked
            </button>
            {activeDayStatus && (
              <button
                onClick={() => handlePickStatus("clear")}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-sm font-medium hover:bg-rose-100 transition-colors"
              >
                <Ban className="w-4 h-4" />
                Clear status
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
