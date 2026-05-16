"use client";

import { motion } from "framer-motion";
import {
  FileText, Calendar, ClipboardList, Sparkles, ArrowRight,
  CheckCircle2, Clock, Phone, MessageSquare, ChevronRight,
  PartyPopper, UserCheck, Mic2, IndianRupee, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Enquiry, Proposal, Booking } from "@/types";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ClientOverviewProps {
  enquiries: (Enquiry & { coordinator?: { name: string; phone: string } | null })[];
  proposals: (Proposal & { enquiry?: { event_type: string; event_date: string; city: string } })[];
  upcomingBookings: (Booking & { artist?: { user: { name: string; avatar_url?: string } } })[];
  userName: string;
}

const JOURNEY_STEPS = [
  { key: "new",                  label: "Enquiry Received",    desc: "We've received your request",                next: "A coordinator will be assigned shortly" },
  { key: "assigned",             label: "Coordinator Assigned", desc: "Your coordinator is reviewing your needs",   next: "They will gather more details from you" },
  { key: "requirement_gathering",label: "Gathering Details",   desc: "Your coordinator is noting your preferences", next: "Artist shortlisting will begin soon" },
  { key: "shortlisting",         label: "Shortlisting Artists", desc: "Best artists are being handpicked for you",  next: "A proposal will be sent shortly" },
  { key: "proposal_sent",        label: "Proposal Ready",      desc: "Your custom proposal is waiting for review",  next: "Please review and accept to confirm" },
  { key: "confirmed",            label: "Booking Confirmed",    desc: "Your event is confirmed!",                  next: "Advance payment secures your artist" },
  { key: "in_progress",          label: "Event in Progress",    desc: "Your event is happening!",                  next: "Enjoy every moment" },
  { key: "completed",            label: "Event Complete",       desc: "Your event wrapped up beautifully",          next: "Leave a review to help others" },
];

const STEP_KEYS = JOURNEY_STEPS.map((s) => s.key);

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function JourneyBar({ status }: { status: string }) {
  const stepIdx = STEP_KEYS.indexOf(status);
  const progress = stepIdx >= 0 ? Math.round(((stepIdx + 1) / STEP_KEYS.length) * 100) : 0;
  const step = JOURNEY_STEPS.find((s) => s.key === status);
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-indigo-700">{step?.label ?? status}</span>
        <span className="text-muted-foreground">{progress}% complete</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full gold-gradient rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
      {step?.next && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ChevronRight className="w-3 h-3 text-amber-500 flex-shrink-0" />
          Next: {step.next}
        </p>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function ClientOverview({ enquiries, proposals, upcomingBookings, userName }: ClientOverviewProps) {
  const router = useRouter();
  const pendingProposals = proposals.filter((p) => p.status === "sent");
  const activeEnquiries = enquiries.filter((e) => !["completed", "cancelled"].includes(e.status));
  const nextEvent = upcomingBookings[0];
  const daysLeft = nextEvent ? daysUntil(nextEvent.event_date) : null;

  const firstName = userName.split(" ")[0];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">

      {/* ── Hero welcome ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl navy-gradient p-6 md:p-8 text-white"
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gold-500/10" />
        <div className="absolute -bottom-8 -left-6 w-32 h-32 rounded-full bg-gold-500/05" />

        <div className="relative">
          <p className="text-white/60 text-sm font-medium tracking-wide">{getGreeting()},</p>
          <h2 className="font-display text-3xl font-bold mt-1">{firstName} <span className="text-gold-400">✦</span></h2>
          <p className="text-white/70 text-sm mt-2 max-w-md">
            {activeEnquiries.length > 0
              ? `You have ${activeEnquiries.length} active event ${activeEnquiries.length === 1 ? "plan" : "plans"} in progress. We're on it!`
              : nextEvent
              ? `Your next event is in ${daysLeft} days. We can't wait!`
              : "Ready to plan something extraordinary? Let's make it unforgettable."}
          </p>
          <div className="flex gap-3 mt-5 flex-wrap">
            <Link href="/enquiry">
              <Button size="sm" className="bg-gold-500 hover:bg-gold-400 text-navy-900 font-semibold">
                <Sparkles className="w-4 h-4 mr-2" />Plan New Event
              </Button>
            </Link>
            <Link href="/artists">
              <Button size="sm" variant="glass">
                <Mic2 className="w-4 h-4 mr-2" />Browse Artists
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Priority action: pending proposals ── */}
      {pendingProposals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5"
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-200/30 -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center flex-shrink-0 shadow-md">
                <ClipboardList className="w-6 h-6 text-navy-900" />
              </div>
              <div>
                <p className="font-display font-bold text-amber-900 text-base">
                  {pendingProposals.length === 1
                    ? "Your proposal is ready to review!"
                    : `${pendingProposals.length} proposals are waiting for your decision`}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Our coordinator has curated the perfect artists for your event. Accept to confirm your booking.
                </p>
              </div>
            </div>
            <Link href="/client/proposals" className="flex-shrink-0">
              <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                Review Now <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* ── Upcoming event countdown ── */}
      {nextEvent && daysLeft !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl border overflow-hidden ${
            daysLeft <= 3 ? "border-red-200 bg-red-50/50" :
            daysLeft <= 7 ? "border-amber-200 bg-amber-50/30" :
            "border-emerald-200 bg-emerald-50/30"
          }`}
        >
          <div className="p-5 flex items-center gap-5 flex-wrap">
            {/* Countdown block */}
            <div className={`flex-shrink-0 text-center px-6 py-3 rounded-xl ${
              daysLeft <= 3 ? "bg-red-100" :
              daysLeft <= 7 ? "bg-amber-100" :
              "bg-emerald-100"
            }`}>
              {daysLeft === 0 ? (
                <>
                  <p className="text-3xl font-display font-bold text-red-600">TODAY</p>
                  <p className="text-xs font-semibold text-red-500 mt-0.5">Event Day!</p>
                </>
              ) : (
                <>
                  <p className={`text-4xl font-display font-bold ${
                    daysLeft <= 3 ? "text-red-600" : daysLeft <= 7 ? "text-amber-600" : "text-emerald-600"
                  }`}>{daysLeft}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${
                    daysLeft <= 3 ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : "text-emerald-500"
                  }`}>{daysLeft === 1 ? "day left" : "days left"}</p>
                </>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <PartyPopper className="w-4 h-4 text-amber-500" />
                <p className="font-semibold text-sm">Upcoming Event</p>
              </div>
              <p className="font-display font-bold text-lg">{nextEvent.venue}</p>
              <p className="text-sm text-muted-foreground">{nextEvent.city} · {formatDate(nextEvent.event_date)}</p>
              {nextEvent.artist?.user && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-6 h-6 rounded-full gold-gradient flex items-center justify-center text-navy-900 text-[10px] font-bold">
                    {getInitials(nextEvent.artist.user.name)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{nextEvent.artist.user.name}</span> is confirmed
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 inline ml-1" />
                  </p>
                </div>
              )}
            </div>

            <Link href="/client/events" className="flex-shrink-0">
              <Button variant="outline" size="sm">
                View Details <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── My Enquiries Journey (3/5) ── */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-lg">My Event Plans</h3>
            <Link href="/client/enquiries">
              <Button size="sm" variant="outline" className="text-xs">View All <ChevronRight className="w-3 h-3 ml-1" /></Button>
            </Link>
          </div>

          {enquiries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border-2 border-dashed border-muted p-8 text-center"
            >
              <Sparkles className="w-10 h-10 mx-auto text-gold-400 mb-3" />
              <p className="font-semibold mb-1">No event plans yet</p>
              <p className="text-sm text-muted-foreground mb-4">Start planning your dream event today</p>
              <Link href="/enquiry">
                <Button size="sm"><Sparkles className="w-4 h-4 mr-2" />Get Started</Button>
              </Link>
            </motion.div>
          ) : (
            enquiries.slice(0, 4).map((enquiry, i) => (
              <motion.div
                key={enquiry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-2xl border bg-card p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm truncate">{enquiry.event_type}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(enquiry.event_date)} · {enquiry.city}
                    </p>
                  </div>
                  <Link href={`/client/enquiries/${enquiry.id}`}>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 flex-shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>

                <JourneyBar status={enquiry.status} />

                {/* Coordinator contact */}
                {enquiry.coordinator ? (
                  <div className="mt-3 flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[10px] font-bold">
                        {getInitials(enquiry.coordinator.name)}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{enquiry.coordinator.name}</p>
                        <p className="text-[10px] text-muted-foreground">Your Coordinator</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={`tel:${enquiry.coordinator.phone}`}>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                          <Phone className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                      <Link href="/client/messages">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    A coordinator will be assigned to you shortly
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* ── Right column (2/5) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Quick links */}
          <h3 className="font-display font-semibold text-lg">Quick Access</h3>
          <div className="space-y-2">
            {[
              { label: "My Proposals",    sub: `${pendingProposals.length} pending`,   href: "/client/proposals", icon: ClipboardList, color: "bg-amber-100 text-amber-600",  urgent: pendingProposals.length > 0 },
              { label: "My Events",       sub: `${upcomingBookings.length} upcoming`,  href: "/client/events",    icon: Calendar,      color: "bg-emerald-100 text-emerald-600", urgent: false },
              { label: "Payments",        sub: "View payment status",                  href: "/client/payments",  icon: IndianRupee,   color: "bg-blue-100 text-blue-600",       urgent: false },
              { label: "Messages",        sub: "Chat with coordinator",                href: "/client/messages",  icon: MessageSquare, color: "bg-violet-100 text-violet-600",   urgent: false },
              { label: "Browse Artists",  sub: "Explore 500+ artists",                 href: "/artists",          icon: Mic2,          color: "bg-rose-100 text-rose-600",       urgent: false },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ x: 3 }}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm ${
                      item.urgent ? "border-amber-300 bg-amber-50/50" : "bg-card hover:border-indigo-200"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                      <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                    {item.urgent && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* Support card */}
          <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer">
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white mt-4 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Need help?</p>
                  <p className="text-xs text-emerald-100">Chat with us on WhatsApp — we reply in minutes</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/70" />
              </div>
            </motion.div>
          </a>
        </div>
      </div>
    </div>
  );
}
