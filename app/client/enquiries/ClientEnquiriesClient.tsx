"use client";

import { motion } from "framer-motion";
import {
  Plus, Calendar, MapPin, Phone, MessageSquare,
  ChevronRight, Clock, CheckCircle, Circle, Sparkles,
  IndianRupee, UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import Link from "next/link";

interface ClientEnquiry {
  id: string;
  event_type: string;
  event_date: string;
  city: string;
  status: string;
  budget_min: number;
  budget_max: number;
  created_at: string;
  coordinator_id?: string | null;
  coordinator?: { name: string; phone: string } | null;
}

interface Props {
  enquiries: ClientEnquiry[];
}

const JOURNEY = [
  { key: "new",                   label: "Enquiry Received",      desc: "Waiting for coordinator assignment" },
  { key: "assigned",              label: "Coordinator Assigned",  desc: "Your coordinator is on it" },
  { key: "requirement_gathering", label: "Details Gathered",      desc: "Coordinator noted your preferences" },
  { key: "shortlisting",          label: "Artists Shortlisted",   desc: "Best matches selected for you" },
  { key: "proposal_sent",         label: "Proposal Sent",         desc: "Review your artist options" },
  { key: "confirmed",             label: "Booking Confirmed",      desc: "Your event is booked!" },
  { key: "in_progress",           label: "Event in Progress",      desc: "Your event is happening!" },
  { key: "completed",             label: "Completed",              desc: "Hope it was amazing!" },
];

const STATUS_COLORS: Record<string, string> = {
  new:                   "bg-blue-100 text-blue-700",
  assigned:              "bg-violet-100 text-violet-700",
  requirement_gathering: "bg-cyan-100 text-cyan-700",
  shortlisting:          "bg-indigo-100 text-indigo-700",
  proposal_sent:         "bg-amber-100 text-amber-700",
  confirmed:             "bg-emerald-100 text-emerald-700",
  in_progress:           "bg-green-100 text-green-700",
  completed:             "bg-teal-100 text-teal-700",
  cancelled:             "bg-red-100 text-red-600",
};

function MiniJourney({ status }: { status: string }) {
  const currentIdx = JOURNEY.findIndex((j) => j.key === status);
  const showSteps = JOURNEY.slice(0, 6); // show up to confirmed

  return (
    <div className="flex items-center gap-0 mt-4">
      {showSteps.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                done   ? "bg-gold-500 border-gold-500" :
                active ? "bg-white border-gold-500 shadow-[0_0_0_3px_rgba(245,158,11,0.2)]" :
                         "bg-white border-border"
              }`}>
                {done && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                {active && <div className="w-2 h-2 rounded-full bg-gold-500" />}
                {!done && !active && <Circle className="w-3 h-3 text-border" />}
              </div>
              <p className="text-[8px] text-center text-muted-foreground mt-1 w-12 leading-tight hidden sm:block">
                {step.label}
              </p>
            </div>
            {i < showSteps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${done ? "bg-gold-400" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function ClientEnquiriesClient({ enquiries }: Props) {
  const active = enquiries.filter((e) => !["completed", "cancelled"].includes(e.status));
  const past   = enquiries.filter((e) =>  ["completed", "cancelled"].includes(e.status));

  const EnquiryCard = ({ e, i }: { e: ClientEnquiry; i: number }) => {
    const step = JOURNEY.find((j) => j.key === e.status);
    const days = daysUntil(e.event_date);
    const isActionNeeded = e.status === "proposal_sent";
    const isConfirmed = ["confirmed", "in_progress"].includes(e.status);

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.07 }}
        className={`rounded-2xl border overflow-hidden hover:shadow-lg transition-all ${
          isActionNeeded ? "border-amber-300 shadow-amber-100 shadow-sm" : ""
        }`}
      >
        {/* Top accent bar */}
        {isActionNeeded && <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />}
        {isConfirmed && <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />}

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-base">{e.event_type}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[e.status] ?? "bg-muted text-muted-foreground"}`}>
                  {step?.label ?? e.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(e.event_date)}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.city}</span>
                <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{formatCurrency(e.budget_min)}–{formatCurrency(e.budget_max)}</span>
              </div>
            </div>

            {/* Days left badge */}
            {days >= 0 && !["completed", "cancelled"].includes(e.status) && (
              <div className={`flex-shrink-0 text-center px-3 py-2 rounded-xl ${
                days <= 7 ? "bg-red-100 text-red-700" :
                days <= 30 ? "bg-amber-100 text-amber-700" :
                "bg-blue-50 text-blue-700"
              }`}>
                <p className="text-xl font-display font-bold leading-none">{days === 0 ? "!" : days}</p>
                <p className="text-[9px] font-semibold mt-0.5">{days === 0 ? "TODAY" : "days left"}</p>
              </div>
            )}
          </div>

          {/* Journey progress */}
          {!["completed", "cancelled"].includes(e.status) && (
            <MiniJourney status={e.status} />
          )}

          {/* What happens next */}
          {step?.desc && (
            <div className={`mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
              isActionNeeded ? "bg-amber-50 text-amber-700" :
              isConfirmed ? "bg-emerald-50 text-emerald-700" :
              "bg-muted/40 text-muted-foreground"
            }`}>
              {isActionNeeded ? <Sparkles className="w-3 h-3 flex-shrink-0" /> : <Clock className="w-3 h-3 flex-shrink-0" />}
              {isActionNeeded ? "Your proposal is ready — please review and accept to confirm your booking!" : step.desc}
            </div>
          )}

          {/* Coordinator + actions */}
          <div className="mt-4 pt-4 border-t space-y-3">
            {e.coordinator ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                    {getInitials(e.coordinator.name)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{e.coordinator.name}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />Your Coordinator
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${e.coordinator.phone}`}>
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                      <Phone className="w-4 h-4" />
                    </Button>
                  </a>
                  <Link href="/client/messages">
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />Coordinator being assigned…
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              {isActionNeeded && (
                <Link href="/client/proposals" className="flex-1">
                  <Button className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold">
                    Review Proposal <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              )}
              <Link href={`/client/enquiries/${e.id}`} className={isActionNeeded ? "sm:flex-shrink-0" : "flex-1"}>
                <Button variant="outline" className="w-full h-11 sm:h-9 text-sm">
                  View Details <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* CTA header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl">My Event Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {enquiries.length === 0 ? "Start planning your first event" : `${active.length} active · ${past.length} completed`}
          </p>
        </div>
        <Link href="/enquiry">
          <Button>
            <Plus className="w-4 h-4 mr-2" />New Enquiry
          </Button>
        </Link>
      </div>

      {/* Active enquiries */}
      {active.length > 0 && (
        <div className="space-y-4">
          {active.map((e, i) => <EnquiryCard key={e.id} e={e} i={i} />)}
        </div>
      )}

      {/* Past enquiries */}
      {past.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Past Events</h2>
          <div className="space-y-3">
            {past.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl border hover:bg-accent/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{e.event_type}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(e.event_date)} · {e.city}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_COLORS[e.status] ?? "bg-muted text-muted-foreground"}`}>
                  {JOURNEY.find((j) => j.key === e.status)?.label ?? e.status}
                </span>
                <Link href={`/client/enquiries/${e.id}`}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {enquiries.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 rounded-3xl border-2 border-dashed border-muted"
        >
          <div className="flex justify-center mb-4">
            <BrandLogo size="md" />
          </div>
          <h3 className="font-display font-bold text-xl mb-2">Plan your first event</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            Tell us about your event and we'll connect you with the perfect artists
          </p>
          <Link href="/enquiry">
            <Button size="lg">
              <Sparkles className="w-5 h-5 mr-2" />Submit an Enquiry
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}
