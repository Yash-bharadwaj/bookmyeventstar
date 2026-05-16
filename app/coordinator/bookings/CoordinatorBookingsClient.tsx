"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertCircle, Calendar, MapPin, User, IndianRupee, Mic2, Plane, Wrench, Receipt, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Booking, Task } from "@/types";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel, getInitials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface BookingWithExtras extends Omit<Booking, "artist" | "enquiry"> {
  artist?: {
    id: string;
    user: { name: string; phone: string; avatar_url?: string };
    categories: string[];
  };
  enquiry?: {
    event_type: string;
    client?: { name: string; phone: string };
  };
  tasks?: Task[];
}

const TASK_LABELS: Record<string, string> = {
  artist_confirmation: "Artist Confirmation",
  travel_stay: "Travel & Stay",
  technical: "Technical Setup",
  payment_docs: "Payments & Docs",
  hospitality: "Hospitality",
};

const TASK_ICONS: Record<string, LucideIcon> = {
  artist_confirmation: Mic2,
  travel_stay:        Plane,
  technical:          Wrench,
  payment_docs:       Receipt,
  hospitality:        UtensilsCrossed,
};

const TASK_COLORS: Record<string, string> = {
  artist_confirmation: "bg-rose-100 text-rose-600",
  travel_stay:        "bg-blue-100 text-blue-600",
  technical:          "bg-amber-100 text-amber-600",
  payment_docs:       "bg-emerald-100 text-emerald-600",
  hospitality:        "bg-orange-100 text-orange-600",
};

export function CoordinatorBookingsClient({ bookings }: { bookings: BookingWithExtras[] }) {
  const router = useRouter();
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const updateTaskStatus = async (taskId: string, done: boolean) => {
    setUpdatingTask(taskId);
    const supabase = createClient();
    await supabase
      .from("tasks")
      .update({ status: done ? "done" : "pending" })
      .eq("id", taskId);
    toast.success(done ? "Task marked complete!" : "Task reopened");
    setUpdatingTask(null);
    router.refresh();
  };

  const upcoming = bookings.filter((b) => b.status === "confirmed" || b.status === "in_progress");
  const completed = bookings.filter((b) => b.status === "completed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  const BookingCard = ({ booking }: { booking: BookingWithExtras }) => {
    const completedTasks = booking.tasks?.filter((t) => t.status === "done").length ?? 0;
    const totalTasks = booking.tasks?.length ?? 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border overflow-hidden hover:shadow-md transition-all"
      >
        {/* Header */}
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base">{booking.enquiry?.event_type ?? "Event"}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusColor(booking.status)}`}>
                {getStatusLabel(booking.status)}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(booking.event_date)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {booking.venue}, {booking.city}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display font-bold text-lg">{formatCurrency(booking.total_amount)}</p>
            <p className="text-xs text-muted-foreground">Balance: {formatCurrency(booking.balance_amount)}</p>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Artist info */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Artist</p>
            {booking.artist ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-navy-900 font-bold text-sm flex-shrink-0">
                  {getInitials(booking.artist.user.name)}
                </div>
                <div>
                  <p className="font-medium text-sm">{booking.artist.user.name}</p>
                  <p className="text-xs text-muted-foreground">{booking.artist.user.phone}</p>
                  <div className="flex gap-1 mt-1">
                    {booking.artist.categories.slice(0, 1).map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not assigned</p>
            )}
          </div>

          {/* Client info */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Client</p>
            {booking.enquiry?.client ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                  {getInitials(booking.enquiry.client.name)}
                </div>
                <div>
                  <p className="font-medium text-sm">{booking.enquiry.client.name}</p>
                  <p className="text-xs text-muted-foreground">{booking.enquiry.client.phone}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>

        {/* Task checklist */}
        {booking.tasks && booking.tasks.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                Checklist Progress
              </p>
              <span className="text-xs font-medium text-gold-600">
                {completedTasks}/{totalTasks} done
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-3">
              <div
                className="h-full gold-gradient rounded-full transition-all"
                style={{ width: `${totalTasks ? (completedTasks / totalTasks) * 100 : 0}%` }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {booking.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border hover:bg-accent/30 transition-colors"
                >
                  {(() => { const Icon = TASK_ICONS[task.type] ?? Wrench; return <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${TASK_COLORS[task.type] ?? "bg-gray-100 text-gray-600"}`}><Icon className="w-3.5 h-3.5" /></div>; })()}
                  <span className="flex-1 text-xs font-medium truncate">{TASK_LABELS[task.type]}</span>
                  <Switch
                    checked={task.status === "done"}
                    disabled={updatingTask === task.id}
                    onCheckedChange={(checked) => updateTaskStatus(task.id, checked)}
                    className="scale-75"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-6">
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completed.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({cancelled.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {upcoming.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No upcoming bookings</p>
          ) : (
            upcoming.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </TabsContent>
        <TabsContent value="completed" className="mt-6 space-y-4">
          {completed.map((b) => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
        <TabsContent value="cancelled" className="mt-6 space-y-4">
          {cancelled.map((b) => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
