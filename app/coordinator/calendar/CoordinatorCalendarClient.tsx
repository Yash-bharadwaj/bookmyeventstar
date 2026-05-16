"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, getStatusColor, getStatusLabel } from "@/lib/utils";

interface BookingEvent {
  id: string;
  event_date: string;
  venue: string;
  city: string;
  status: string;
  enquiry?: { event_type: string } | null;
}

export function CoordinatorCalendarClient({ bookings }: { bookings: BookingEvent[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();

  const getEventsForDay = (day: Date) =>
    bookings.filter((b) => isSameDay(new Date(b.event_date), day));

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const statusColors: Record<string, string> = {
    confirmed: "bg-blue-500",
    in_progress: "bg-amber-500",
    completed: "bg-emerald-500",
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle>{format(currentDate, "MMMM yyyy")}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {days.map((day) => {
                const events = getEventsForDay(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-start p-1 text-sm transition-all relative",
                      isToday(day) && "ring-2 ring-gold-500",
                      isSelected && "gold-gradient text-navy-900 shadow-md",
                      !isSelected && events.length > 0 && "bg-blue-50 hover:bg-blue-100",
                      !isSelected && events.length === 0 && "hover:bg-muted"
                    )}
                  >
                    <span className="font-medium">{day.getDate()}</span>
                    {events.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                        {events.slice(0, 3).map((e, i) => (
                          <span
                            key={i}
                            className={cn("w-1.5 h-1.5 rounded-full", statusColors[e.status] ?? "bg-gray-400")}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              {Object.entries(statusColors).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span className={cn("w-2.5 h-2.5 rounded-full", color)} />
                  {getStatusLabel(status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Events panel */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold">
            {selectedDay ? format(selectedDay, "MMMM d, yyyy") : "Select a date"}
          </h3>
          {selectedDay ? (
            selectedEvents.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No events on this day
                </CardContent>
              </Card>
            ) : (
              selectedEvents.map((e) => (
                <Card key={e.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{e.enquiry?.event_type ?? "Event"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{e.venue}</p>
                        <p className="text-xs text-muted-foreground">{e.city}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(e.status)}`}>
                        {getStatusLabel(e.status)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Click a date to see events</p>
              </CardContent>
            </Card>
          )}

          {/* This month summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Total Events", value: bookings.filter((b) => {
                  const d = new Date(b.event_date);
                  return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
                }).length },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-bold">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
