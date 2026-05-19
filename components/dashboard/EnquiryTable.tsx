"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Filter, Search, Globe, MessageCircle, Mail, Camera, Handshake, PersonStanding, X, ChevronDown, Briefcase, Building2, Heart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Enquiry, EnquirySubmitterType } from "@/types";
import { formatDate, formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from "@/lib/utils";
import Link from "next/link";

interface EnquiryTableProps {
  enquiries: Enquiry[];
  baseHref: string;
  showCoordinator?: boolean;
  onAssign?: (enquiry: Enquiry) => void;
}

const STATUS_OPTIONS = [
  "new", "assigned", "requirement_gathering", "shortlisting",
  "proposal_sent", "confirmed", "in_progress", "completed", "cancelled",
];

const SOURCE_OPTIONS = ["website", "whatsapp", "email", "instagram", "referral", "walk_in"];

const SUBMITTER_OPTIONS: { value: EnquirySubmitterType; label: string; color: string }[] = [
  { value: "personal", label: "Personal", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "company", label: "Company", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "planner", label: "Planner", color: "bg-amber-100 text-amber-900 border-amber-200" },
];

export function EnquiryTable({ enquiries, baseHref, showCoordinator = false, onAssign }: EnquiryTableProps) {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [submitterFilter, setSubmitterFilter] = useState<EnquirySubmitterType[]>([]);

  const toggleStatus = (s: string) =>
    setStatusFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const toggleSource = (s: string) =>
    setSourceFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const toggleSubmitter = (s: EnquirySubmitterType) =>
    setSubmitterFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const clearFilters = () => {
    setStatusFilter([]);
    setSourceFilter([]);
    setSubmitterFilter([]);
  };

  const activeFilterCount = statusFilter.length + sourceFilter.length + submitterFilter.length;

  const filtered = enquiries.filter((e) => {
    const matchesSearch =
      e.event_type.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase()) ||
      (e.client?.name ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(e.status);
    const matchesSource = sourceFilter.length === 0 || sourceFilter.includes(e.source);
    const st = e.submitter_type ?? "personal";
    const matchesSubmitter = submitterFilter.length === 0 || submitterFilter.includes(st);

    return matchesSearch && matchesStatus && matchesSource && matchesSubmitter;
  });

  const sourceIcons: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    website:   { icon: Globe,          color: "text-blue-500",   label: "Website" },
    whatsapp:  { icon: MessageCircle,  color: "text-green-500",  label: "WhatsApp" },
    email:     { icon: Mail,           color: "text-violet-500", label: "Email" },
    instagram: { icon: Camera,         color: "text-pink-500",   label: "Instagram" },
    referral:  { icon: Handshake,      color: "text-amber-500",  label: "Referral" },
    walk_in:   { icon: PersonStanding, color: "text-teal-500",   label: "Walk-in" },
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by client, event type, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          className="relative"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-8">
            <X className="w-3.5 h-3.5 mr-1" />Clear
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                        statusFilter.includes(s)
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-background border-border text-muted-foreground hover:border-indigo-400"
                      }`}
                    >
                      {getStatusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Source</p>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_OPTIONS.map((s) => {
                    const src = sourceIcons[s];
                    const Icon = src?.icon ?? Globe;
                    return (
                      <button
                        key={s}
                        onClick={() => toggleSource(s)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                          sourceFilter.includes(s)
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-background border-border text-muted-foreground hover:border-indigo-400"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {src?.label ?? s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Who is booking</p>
                <div className="flex flex-wrap gap-2">
                  {SUBMITTER_OPTIONS.map((opt) => {
                    const Icon = opt.value === "personal" ? Heart : opt.value === "company" ? Building2 : Briefcase;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleSubmitter(opt.value)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                          submitterFilter.includes(opt.value)
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-background border-border text-muted-foreground hover:border-indigo-400"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results summary */}
      {(search || activeFilterCount > 0) && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {enquiries.length} enquiries
        </p>
      )}

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client / Event</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date & City</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Budget</th>
                {showCoordinator && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Coordinator</th>
                )}
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Source</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={showCoordinator ? 7 : 6} className="py-12 text-center text-muted-foreground text-sm">
                    {enquiries.length === 0 ? "No enquiries yet" : "No enquiries match your filters"}
                  </td>
                </tr>
              ) : (
                filtered.map((enquiry, i) => (
                  <motion.tr
                    key={enquiry.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b last:border-0 hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{enquiry.client?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{enquiry.event_type}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {(() => {
                          const st = enquiry.submitter_type ?? "personal";
                          const meta = SUBMITTER_OPTIONS.find((o) => o.value === st);
                          const Icon = st === "personal" ? Heart : st === "company" ? Building2 : Briefcase;
                          return (
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${meta?.color ?? "bg-slate-100 text-slate-700 border-slate-200"}`}
                            >
                              <Icon className="w-3 h-3" />
                              {meta?.label ?? st}
                            </span>
                          );
                        })()}
                        {enquiry.phone_verified_at && (
                          <span
                            title={`Phone verified ${formatDateTime(enquiry.phone_verified_at)}`}
                            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            OTP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{formatDate(enquiry.event_date)}</p>
                      <p className="text-xs text-muted-foreground">{enquiry.city}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {formatCurrency(enquiry.budget_min)} – {formatCurrency(enquiry.budget_max)}
                    </td>
                    {showCoordinator && (
                      <td className="px-4 py-3 text-sm">
                        {enquiry.coordinator?.name ?? (
                          <button
                            onClick={() => onAssign?.(enquiry)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-300 rounded-lg px-2 py-0.5"
                          >
                            Assign
                          </button>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(enquiry.status)}`}>
                        {getStatusLabel(enquiry.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const src = sourceIcons[enquiry.source];
                        if (!src) return <span className="text-muted-foreground text-xs">—</span>;
                        const Icon = src.icon;
                        return (
                          <span title={src.label} className={`inline-flex items-center gap-1 text-xs font-medium ${src.color}`}>
                            <Icon className="w-3.5 h-3.5" />{src.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`${baseHref}/${enquiry.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
