"use client";

import { useState } from "react";
import {
  ArrowLeft, Calendar, MapPin, User, Phone, Mail,
  IndianRupee, Mic2, CheckCircle, Plane, Wrench, Receipt, UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel, getInitials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TASK_LABELS: Record<string, string> = {
  artist_confirmation: "Artist Confirmation",
  travel_stay: "Travel & Stay",
  technical: "Technical Setup",
  payment_docs: "Payments & Docs",
  hospitality: "Hospitality",
};
const TASK_ICONS: Record<string, LucideIcon> = {
  artist_confirmation: Mic2, travel_stay: Plane, technical: Wrench,
  payment_docs: Receipt, hospitality: UtensilsCrossed,
};
const TASK_COLORS: Record<string, string> = {
  artist_confirmation: "bg-rose-100 text-rose-600",
  travel_stay: "bg-blue-100 text-blue-600",
  technical: "bg-amber-100 text-amber-600",
  payment_docs: "bg-emerald-100 text-emerald-600",
  hospitality: "bg-orange-100 text-orange-600",
};

export function CoordinatorBookingDetail({ booking }: { booking: any }) {
  const router = useRouter();
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState(booking.status);
  const [savingStatus, setSavingStatus] = useState(false);

  const updateTask = async (taskId: string, done: boolean) => {
    setUpdatingTask(taskId);
    const supabase = createClient();
    await supabase.from("tasks").update({ status: done ? "done" : "pending" }).eq("id", taskId);
    toast.success(done ? "Task complete!" : "Task reopened");
    setUpdatingTask(null);
    router.refresh();
  };

  const updateStatus = async () => {
    setSavingStatus(true);
    const supabase = createClient();
    await supabase.from("bookings").update({ status: bookingStatus }).eq("id", booking.id);
    toast.success("Booking status updated!");
    setSavingStatus(false);
    router.refresh();
  };

  const completedTasks = (booking.tasks ?? []).filter((t: any) => t.status === "done").length;
  const totalTasks = (booking.tasks ?? []).length;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/coordinator/bookings">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />Back to Bookings
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{booking.enquiry?.event_type ?? "Booking"}</h1>
          <p className="text-muted-foreground text-sm mt-1">Booking #{booking.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>
          {getStatusLabel(booking.status)}
        </span>
      </div>

      {/* Event Details */}
      <div className="rounded-2xl border p-5">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />Event Details
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Date</p>
            <p className="font-medium mt-0.5">{formatDate(booking.event_date)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Venue</p>
            <p className="font-medium mt-0.5">{booking.venue}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">City</p>
            <p className="font-medium mt-0.5">{booking.city}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Balance</p>
            <p className="font-medium mt-0.5">{formatCurrency(booking.balance_amount)}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-blue-50 text-center">
            <p className="text-xs text-blue-600">Total</p>
            <p className="font-bold text-blue-700">{formatCurrency(booking.total_amount)}</p>
          </div>
          <div className="p-3 rounded-xl bg-green-50 text-center">
            <p className="text-xs text-green-600">Advance</p>
            <p className="font-bold text-green-700">{formatCurrency(booking.advance_amount)}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-center">
            <p className="text-xs text-amber-600">Balance</p>
            <p className="font-bold text-amber-700">{formatCurrency(booking.balance_amount)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Client */}
        <div className="rounded-2xl border p-5 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-violet-500" />Client
          </h2>
          {booking.enquiry?.client ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{booking.enquiry.client.name}</p>
              <a href={`tel:${booking.enquiry.client.phone}`} className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />{booking.enquiry.client.phone}
              </a>
              <a href={`mailto:${booking.enquiry.client.email}`} className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />{booking.enquiry.client.email}
              </a>
            </div>
          ) : <p className="text-sm text-muted-foreground">No client info</p>}
        </div>

        {/* Artist */}
        <div className="rounded-2xl border p-5 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Mic2 className="w-4 h-4 text-rose-500" />Artist
          </h2>
          {booking.artist ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-sm">
                  {getInitials(booking.artist.user?.name ?? "A")}
                </div>
                <div>
                  <p className="font-medium">{booking.artist.user?.name}</p>
                  <div className="flex gap-1 mt-0.5">
                    {(booking.artist.categories ?? []).slice(0, 2).map((c: string) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <a href={`tel:${booking.artist.user?.phone}`} className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />{booking.artist.user?.phone}
              </a>
            </div>
          ) : <p className="text-sm text-muted-foreground">No artist assigned</p>}
        </div>
      </div>

      {/* Status Update */}
      <div className="rounded-2xl border p-5 space-y-3">
        <h2 className="font-semibold text-sm">Update Booking Status</h2>
        <div className="flex items-center gap-3">
          <Select value={bookingStatus} onValueChange={setBookingStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={updateStatus} loading={savingStatus} disabled={bookingStatus === booking.status}>
            Update
          </Button>
        </div>
      </div>

      {/* Tasks Checklist */}
      <div className="rounded-2xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Checklist Progress</h2>
          <span className="text-xs text-muted-foreground">{completedTasks}/{totalTasks} done</span>
        </div>
        {totalTasks > 0 && (
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
              style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
            />
          </div>
        )}
        {(booking.tasks ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks created for this booking.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(booking.tasks ?? []).map((task: any) => {
              const Icon = TASK_ICONS[task.type] ?? Wrench;
              return (
                <div key={task.id} className="flex items-center gap-2.5 p-3 rounded-xl border hover:bg-accent/30 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${TASK_COLORS[task.type] ?? "bg-gray-100 text-gray-600"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-sm font-medium">{TASK_LABELS[task.type] ?? task.type}</span>
                  <Switch
                    checked={task.status === "done"}
                    disabled={updatingTask === task.id}
                    onCheckedChange={(checked) => updateTask(task.id, checked)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
