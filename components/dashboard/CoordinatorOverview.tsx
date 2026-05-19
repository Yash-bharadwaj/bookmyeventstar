"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Mic2,
  Plane,
  Wrench,
  Receipt,
  UtensilsCrossed,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { StatCard } from "./StatCard";
import { EnquiryTable } from "./EnquiryTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Enquiry, Booking, Task } from "@/types";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CoordinatorOverviewProps {
  enquiries: Enquiry[];
  upcomingBookings: Booking[];
  pendingTasks: (Task & { booking?: { event_date: string; venue: string; city: string } })[];
  followUpEnquiries?: (Enquiry & { follow_up_date: string; follow_up_notes?: string })[];
}

const taskTypeLabels: Record<string, string> = {
  artist_confirmation: "Artist Confirmation",
  travel_stay: "Travel & Stay",
  technical: "Technical Setup",
  payment_docs: "Payments & Docs",
  hospitality: "Hospitality",
};

const taskTypeIcons: Record<string, LucideIcon> = {
  artist_confirmation: Mic2,
  travel_stay:        Plane,
  technical:          Wrench,
  payment_docs:       Receipt,
  hospitality:        UtensilsCrossed,
};

const taskTypeColors: Record<string, string> = {
  artist_confirmation: "bg-rose-100 text-rose-600",
  travel_stay:        "bg-blue-100 text-blue-600",
  technical:          "bg-amber-100 text-amber-600",
  payment_docs:       "bg-emerald-100 text-emerald-600",
  hospitality:        "bg-orange-100 text-orange-600",
};

export function CoordinatorOverview({
  enquiries,
  upcomingBookings,
  pendingTasks,
  followUpEnquiries = [],
}: CoordinatorOverviewProps) {
  const router = useRouter();

  const newEnquiries = enquiries.filter((e) => e.status === "new" || e.status === "assigned");

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Enquiries" value={enquiries.length} icon={FileText} color="gold" index={0} />
        <StatCard title="New / Assigned" value={newEnquiries.length} icon={AlertTriangle} color="red" index={1} />
        <StatCard title="Pending Tasks" value={pendingTasks.length} icon={Clock} color="blue" index={2} />
        <StatCard title="Upcoming Events" value={upcomingBookings.length} icon={Calendar} color="green" index={3} />
      </div>

      {/* Alerts — follow-up needed */}
      {newEnquiries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {newEnquiries.length} enquir{newEnquiries.length === 1 ? "y" : "ies"} need your attention today
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Follow up immediately to avoid losing the client</p>
          </div>
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-700" onClick={() => router.push("/coordinator/enquiries")}>
            View
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </motion.div>
      )}

      {/* Today's Follow-ups */}
      {followUpEnquiries.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-violet-500" />
              Today&apos;s Follow-ups ({followUpEnquiries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {followUpEnquiries.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link href={`/coordinator/enquiries/${e.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-white hover:border-violet-300 hover:shadow-sm transition-all">
                    <div>
                      <p className="font-semibold text-sm">{e.event_type}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{e.client?.name} · {e.city}</p>
                      {e.follow_up_notes && (
                        <p className="text-xs text-violet-600 mt-0.5 truncate max-w-xs">{e.follow_up_notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(e.status)}`}>
                        {getStatusLabel(e.status)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Tasks */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Today&apos;s Checklist</CardTitle>
            <span className="text-xs text-muted-foreground">{pendingTasks.length} pending</span>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingTasks.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All clear! No pending tasks.</p>
              </div>
            ) : (
              pendingTasks.slice(0, 6).map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-xl border hover:bg-accent/30 transition-colors"
                >
                  {(() => { const Icon = taskTypeIcons[task.type] ?? Wrench; return <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${taskTypeColors[task.type] ?? "bg-gray-100 text-gray-600"}`}><Icon className="w-4 h-4" /></div>; })()}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{taskTypeLabels[task.type]}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {task.booking?.venue}, {task.booking?.city}
                    </p>
                    {task.due_date && (
                      <p className="text-xs text-amber-600 mt-0.5">{formatDate(task.due_date)}</p>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </span>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Events</CardTitle>
            <Button size="sm" variant="outline" onClick={() => router.push("/coordinator/calendar")}>
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Calendar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingBookings.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">No upcoming events</p>
            ) : (
              upcomingBookings.map((booking, i) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link href={`/coordinator/bookings/${booking.id}`}>
                    <div className="flex items-center gap-4 p-4 rounded-xl border hover:border-gold-300 hover:shadow-sm transition-all">
                      <div className="text-center min-w-[48px]">
                        <p className="text-xl font-display font-bold text-gold-600">
                          {new Date(booking.event_date).getDate()}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {new Date(booking.event_date).toLocaleString("en-IN", { month: "short" })}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{booking.venue}</p>
                        <p className="text-xs text-muted-foreground">{booking.city}</p>
                        {booking.artist?.user && (
                          <p className="text-xs text-gold-600 mt-0.5 flex items-center gap-1"><Mic2 className="w-3 h-3" /> {booking.artist.user.name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(booking.total_amount)}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(booking.status)}`}>
                          {getStatusLabel(booking.status)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Enquiries Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Enquiries</CardTitle>
          <Button size="sm" variant="outline" onClick={() => router.push("/coordinator/enquiries")}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <EnquiryTable enquiries={enquiries.slice(0, 8)} baseHref="/coordinator/enquiries" />
        </CardContent>
      </Card>
    </div>
  );
}
