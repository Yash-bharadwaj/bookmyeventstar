"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
} from "date-fns";
import { ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Availability, AvailabilityStatus } from "@/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Props {
  artistProfileId: string;
  availability: Availability[];
}

const STATUS_CONFIG = {
  available: { label: "Available", color: "bg-emerald-500", textColor: "text-emerald-700", bgColor: "bg-emerald-100" },
  booked: { label: "Booked", color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-100" },
  blocked: { label: "Blocked", color: "bg-gray-400", textColor: "text-gray-700", bgColor: "bg-gray-100" },
};

export function ArtistAvailabilityClient({ artistProfileId, availability }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availMap, setAvailMap] = useState<Map<string, AvailabilityStatus>>(
    new Map(availability.map((a) => [a.date, a.status]))
  );
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus>("available");
  const [saving, setSaving] = useState<string | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();

  const handleDayClick = async (day: Date) => {
    if (isBefore(day, new Date()) && !isToday(day)) return;

    const dateStr = format(day, "yyyy-MM-dd");
    const current = availMap.get(dateStr);
    const newStatus: AvailabilityStatus =
      current === selectedStatus ? "available" : selectedStatus;

    setSaving(dateStr);
    try {
      const supabase = createClient();
      await supabase.from("availability").upsert(
        { artist_id: artistProfileId, date: dateStr, status: newStatus },
        { onConflict: "artist_id,date" }
      );
      setAvailMap((prev) => {
        const next = new Map(prev);
        next.set(dateStr, newStatus);
        return next;
      });
    } catch {
      toast.error("Failed to update availability");
    } finally {
      setSaving(null);
    }
  };

  const summary = {
    available: Array.from(availMap.values()).filter((s) => s === "available").length,
    booked: Array.from(availMap.values()).filter((s) => s === "booked").length,
    blocked: Array.from(availMap.values()).filter((s) => s === "blocked").length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Legend & Status Selector */}
      <Card>
        <CardHeader><CardTitle>Manage Your Availability</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Click on a date to mark it. Select the status below before clicking.
          </p>
          <div className="flex flex-wrap gap-3">
            {(["available", "blocked"] as AvailabilityStatus[]).map((s) => {
              const config = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all text-sm font-medium",
                    selectedStatus === s
                      ? `border-current ${config.textColor} ${config.bgColor}`
                      : "border-border text-muted-foreground"
                  )}
                >
                  <span className={cn("w-3 h-3 rounded-full", config.color)} />
                  Mark as {config.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {(Object.keys(STATUS_CONFIG) as AvailabilityStatus[]).map((s) => {
              const config = STATUS_CONFIG[s];
              return (
                <div key={s} className={cn("p-3 rounded-xl text-center", config.bgColor)}>
                  <p className={cn("text-2xl font-display font-bold", config.textColor)}>
                    {summary[s]}
                  </p>
                  <p className={cn("text-xs font-medium", config.textColor)}>{config.label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <CardTitle className="text-base">{format(currentDate, "MMMM yyyy")}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const status = availMap.get(dateStr);
              const isPast = isBefore(day, new Date()) && !isToday(day);
              const isSaving = saving === dateStr;

              return (
                <motion.button
                  key={dateStr}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDayClick(day)}
                  disabled={isPast || isSaving}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all relative",
                    isToday(day) && "ring-2 ring-gold-500",
                    isPast && "opacity-30 cursor-not-allowed",
                    !status && !isPast && "hover:bg-muted",
                    status === "available" && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                    status === "booked" && "bg-red-100 text-red-700 cursor-not-allowed",
                    status === "blocked" && "bg-gray-100 text-gray-500 hover:bg-gray-200",
                    isSaving && "opacity-50"
                  )}
                >
                  {day.getDate()}
                  {status && (
                    <span className={cn(
                      "absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                      STATUS_CONFIG[status].color
                    )} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
