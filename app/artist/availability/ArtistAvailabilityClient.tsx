"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, CalendarCheck, CalendarX,
  CalendarDays, Loader2, RotateCcw, Sunset, Briefcase,
} from "lucide-react";
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
  booked:    { label: "Booked",    color: "bg-red-500",     textColor: "text-red-700",     bgColor: "bg-red-100"     },
  blocked:   { label: "Blocked",   color: "bg-gray-400",    textColor: "text-gray-700",    bgColor: "bg-gray-100"    },
};

type QuickAction = {
  id: string;
  label: string;
  icon: React.ElementType;
  status: AvailabilityStatus | "clear";
  filter: (d: Date) => boolean;
  color: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "available_month",
    label: "Whole Month",
    icon: CalendarCheck,
    status: "available",
    filter: () => true,
    color: "text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100",
  },
  {
    id: "available_weekends",
    label: "Weekends",
    icon: Sunset,
    status: "available",
    filter: (d) => d.getDay() === 0 || d.getDay() === 6,
    color: "text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100",
  },
  {
    id: "available_weekdays",
    label: "Weekdays",
    icon: Briefcase,
    status: "available",
    filter: (d) => d.getDay() >= 1 && d.getDay() <= 5,
    color: "text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100",
  },
  {
    id: "block_month",
    label: "Whole Month",
    icon: CalendarX,
    status: "blocked",
    filter: () => true,
    color: "text-gray-700 border-gray-300 bg-gray-50 hover:bg-gray-100",
  },
  {
    id: "block_weekends",
    label: "Weekends",
    icon: Sunset,
    status: "blocked",
    filter: (d) => d.getDay() === 0 || d.getDay() === 6,
    color: "text-gray-700 border-gray-300 bg-gray-50 hover:bg-gray-100",
  },
  {
    id: "block_weekdays",
    label: "Weekdays",
    icon: Briefcase,
    status: "blocked",
    filter: (d) => d.getDay() >= 1 && d.getDay() <= 5,
    color: "text-gray-700 border-gray-300 bg-gray-50 hover:bg-gray-100",
  },
  {
    id: "clear_month",
    label: "Clear Month",
    icon: RotateCcw,
    status: "clear",
    filter: () => true,
    color: "text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100",
  },
];

export function ArtistAvailabilityClient({ artistProfileId, availability }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availMap, setAvailMap] = useState<Map<string, AvailabilityStatus>>(
    new Map(availability.map((a) => [a.date, a.status]))
  );
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus>("available");
  const [saving, setSaving] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState<string | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const today = new Date();

  // Future days in the current month view (not past, not booked)
  const futureDaysInMonth = (filterFn: (d: Date) => boolean) =>
    days.filter(
      (d) =>
        (!isBefore(d, today) || isToday(d)) &&
        availMap.get(format(d, "yyyy-MM-dd")) !== "booked" &&
        filterFn(d)
    );

  const handleDayClick = async (day: Date) => {
    if (isBefore(day, today) && !isToday(day)) return;

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

  const handleBulkAction = async (action: QuickAction) => {
    const targets = futureDaysInMonth(action.filter);
    if (targets.length === 0) {
      toast("No future dates to update for this selection", { icon: "ℹ️" });
      return;
    }

    setBulkSaving(action.id);
    try {
      const supabase = createClient();
      const dates = targets.map((d) => format(d, "yyyy-MM-dd"));

      if (action.status === "clear") {
        await supabase
          .from("availability")
          .delete()
          .eq("artist_id", artistProfileId)
          .in("date", dates);
        setAvailMap((prev) => {
          const next = new Map(prev);
          dates.forEach((d) => next.delete(d));
          return next;
        });
        toast.success(`Cleared ${dates.length} dates`);
      } else {
        await supabase.from("availability").upsert(
          dates.map((date) => ({ artist_id: artistProfileId, date, status: action.status })),
          { onConflict: "artist_id,date" }
        );
        setAvailMap((prev) => {
          const next = new Map(prev);
          dates.forEach((d) => next.set(d, action.status as AvailabilityStatus));
          return next;
        });
        const label = action.status === "available" ? "Available" : "Blocked";
        toast.success(`${dates.length} dates marked as ${label}`);
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setBulkSaving(null);
    }
  };

  const summary = {
    available: Array.from(availMap.values()).filter((s) => s === "available").length,
    booked:    Array.from(availMap.values()).filter((s) => s === "booked").length,
    blocked:   Array.from(availMap.values()).filter((s) => s === "blocked").length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">

      {/* Status selector + summary */}
      <Card>
        <CardHeader><CardTitle>Manage Your Availability</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click individual dates or use the quick-fill shortcuts below to set availability in bulk.
          </p>

          {/* Mark-as toggles */}
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

          {/* Summary counters */}
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(STATUS_CONFIG) as AvailabilityStatus[]).map((s) => {
              const config = STATUS_CONFIG[s];
              return (
                <div key={s} className={cn("p-3 rounded-xl text-center", config.bgColor)}>
                  <p className={cn("text-2xl font-display font-bold", config.textColor)}>{summary[s]}</p>
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

        <CardContent className="space-y-4">
          {/* Quick Actions */}
          <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Quick fill — {format(currentDate, "MMMM")}
            </p>

            {/* Available row */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">Mark Available</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.filter((a) => a.status === "available").map((action) => {
                  const Icon = action.icon;
                  const isLoading = bulkSaving === action.id;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleBulkAction(action)}
                      disabled={!!bulkSaving}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-50",
                        action.color
                      )}
                    >
                      {isLoading
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Icon className="w-3 h-3" />}
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Block row */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Block / Unavailable</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.filter((a) => a.status === "blocked").map((action) => {
                  const Icon = action.icon;
                  const isLoading = bulkSaving === action.id;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleBulkAction(action)}
                      disabled={!!bulkSaving}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-50",
                        action.color
                      )}
                    >
                      {isLoading
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Icon className="w-3 h-3" />}
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear row */}
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground">Booked dates are never affected by bulk actions.</p>
              {QUICK_ACTIONS.filter((a) => a.status === "clear").map((action) => {
                const Icon = action.icon;
                const isLoading = bulkSaving === action.id;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleBulkAction(action)}
                    disabled={!!bulkSaving}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-50",
                      action.color
                    )}
                  >
                    {isLoading
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Icon className="w-3 h-3" />}
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7">
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
              const isPast = isBefore(day, today) && !isToday(day);
              const isSaving = saving === dateStr;

              return (
                <motion.button
                  key={dateStr}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDayClick(day)}
                  disabled={isPast || isSaving || !!bulkSaving}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all relative",
                    isToday(day) && "ring-2 ring-gold-500",
                    isPast && "opacity-30 cursor-not-allowed",
                    !status && !isPast && "hover:bg-muted",
                    status === "available" && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                    status === "booked" && "bg-red-100 text-red-700 cursor-not-allowed",
                    status === "blocked" && "bg-gray-100 text-gray-500 hover:bg-gray-200",
                    (isSaving || !!bulkSaving) && "opacity-50"
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

          {/* Legend */}
          <div className="flex flex-wrap gap-4 pt-2 border-t text-xs text-muted-foreground">
            {(Object.entries(STATUS_CONFIG) as [AvailabilityStatus, typeof STATUS_CONFIG.available][]).map(([s, c]) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={cn("w-2.5 h-2.5 rounded-full", c.color)} />
                {c.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
