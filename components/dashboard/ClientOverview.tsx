"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Calendar,
  ClipboardList,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
} from "lucide-react";
import { StatCard } from "./StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Enquiry, Proposal, Booking } from "@/types";
import { formatDate, getStatusColor, getStatusLabel, getInitials } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ClientOverviewProps {
  enquiries: (Enquiry & { coordinator?: { name: string; phone: string } | null })[];
  proposals: (Proposal & { enquiry?: { event_type: string; event_date: string; city: string } })[];
  upcomingBookings: (Booking & { artist?: { user: { name: string; avatar_url?: string } } })[];
  userName: string;
}

const STATUS_STEPS = [
  { key: "new", label: "Received" },
  { key: "assigned", label: "Assigned" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "confirmed", label: "Confirmed" },
];

function EnquiryProgressBar({ status }: { status: string }) {
  const stepIndex = STATUS_STEPS.findIndex((s) => s.key === status);
  const progress = stepIndex >= 0 ? ((stepIndex + 1) / STATUS_STEPS.length) * 100 : 0;

  return (
    <div className="mt-3">
      <div className="flex justify-between mb-1.5">
        {STATUS_STEPS.map((s, i) => (
          <div key={s.key} className="flex flex-col items-center flex-1">
            <div
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                i <= stepIndex ? "border-gold-500 bg-gold-500" : "border-border bg-background"
              }`}
            />
            <span className="text-[8px] text-muted-foreground mt-1 text-center hidden sm:block">
              {s.label}
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-1 bg-muted rounded-full overflow-hidden -mt-6 mx-2">
        <div
          className="absolute left-0 top-0 h-full gold-gradient rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function ClientOverview({
  enquiries,
  proposals,
  upcomingBookings,
  userName,
}: ClientOverviewProps) {
  const router = useRouter();
  const pendingProposals = proposals.filter((p) => p.status === "sent");
  const activeEnquiries = enquiries.filter((e) =>
    !["completed", "cancelled"].includes(e.status)
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl navy-gradient p-6 text-white"
      >
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-gold-500/10 -translate-y-1/2 translate-x-1/4" />
        <div className="relative">
          <p className="text-white/70 text-sm">Good day,</p>
          <h2 className="font-display text-2xl font-bold mt-0.5">Welcome, {userName}</h2>
          <p className="text-white/60 text-sm mt-1">
            {activeEnquiries.length > 0
              ? `You have ${activeEnquiries.length} active enquir${activeEnquiries.length > 1 ? "ies" : "y"}`
              : "Ready to plan your next amazing event?"}
          </p>
          <Link href="/enquiry">
            <Button variant="glass" size="sm" className="mt-4">
              <Sparkles className="w-4 h-4 mr-2" />
              New Enquiry
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="My Enquiries" value={enquiries.length} icon={FileText} color="gold" index={0} />
        <StatCard title="Proposals" value={proposals.length} icon={ClipboardList} color="purple" index={1} />
        <StatCard title="Upcoming Events" value={upcomingBookings.length} icon={Calendar} color="green" index={2} />
        <StatCard title="Pending Review" value={pendingProposals.length} icon={Clock} color="blue" index={3} />
      </div>

      {/* Pending proposals alert */}
      {pendingProposals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl bg-gold-50 border-2 border-gold-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-navy-900" />
              </div>
              <div>
                <p className="font-semibold text-gold-900 text-sm">
                  {pendingProposals.length} proposal{pendingProposals.length > 1 ? "s" : ""} waiting for your review
                </p>
                <p className="text-xs text-gold-700">Review artist options and confirm your booking</p>
              </div>
            </div>
            <Button size="sm" onClick={() => router.push("/client/proposals")}>
              Review
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Enquiries */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-lg">My Enquiries</h3>
            <Button size="sm" variant="outline" onClick={() => router.push("/client/enquiries")}>
              View All
            </Button>
          </div>
          {enquiries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm mb-4">No enquiries yet</p>
                <Link href="/enquiry">
                  <Button size="sm">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Submit First Enquiry
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            enquiries.slice(0, 4).map((enquiry, i) => (
              <motion.div
                key={enquiry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card hover>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{enquiry.event_type}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(enquiry.status)}`}>
                            {getStatusLabel(enquiry.status)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(enquiry.event_date)} · {enquiry.city}
                        </p>
                        {enquiry.coordinator && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-[8px] font-bold">
                              {getInitials(enquiry.coordinator.name)}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {enquiry.coordinator.name} (Coordinator)
                            </span>
                            <a href={`tel:${enquiry.coordinator.phone}`}>
                              <Phone className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <EnquiryProgressBar status={enquiry.status} />
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Upcoming Events */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-lg">Upcoming Events</h3>
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              </CardContent>
            </Card>
          ) : (
            upcomingBookings.map((booking, i) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-center bg-gold-50 rounded-xl p-2 min-w-[48px]">
                        <p className="text-xl font-display font-bold text-gold-600">
                          {new Date(booking.event_date).getDate()}
                        </p>
                        <p className="text-[10px] text-gold-600 uppercase font-semibold">
                          {new Date(booking.event_date).toLocaleString("en-IN", { month: "short" })}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{booking.venue}</p>
                        <p className="text-xs text-muted-foreground">{booking.city}</p>
                      </div>
                    </div>
                    {booking.artist?.user && (
                      <div className="flex items-center gap-2 pt-3 border-t">
                        <div className="w-7 h-7 rounded-full gold-gradient flex items-center justify-center text-navy-900 text-xs font-bold">
                          {getInitials(booking.artist.user.name)}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{booking.artist.user.name}</p>
                          <p className="text-[10px] text-muted-foreground">Confirmed Artist</p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}

          {/* WhatsApp CTA */}
          <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer">
            <Card hover className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-emerald-800">Need help?</p>
                  <p className="text-xs text-emerald-600">Chat with us on WhatsApp</p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 ml-auto" />
              </CardContent>
            </Card>
          </a>
        </div>
      </div>
    </div>
  );
}
