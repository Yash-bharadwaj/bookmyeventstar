"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Enquiry } from "@/types";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import Link from "next/link";

interface EnquiryTableProps {
  enquiries: Enquiry[];
  baseHref: string;
  showCoordinator?: boolean;
  onAssign?: (enquiry: Enquiry) => void;
}

export function EnquiryTable({
  enquiries,
  baseHref,
  showCoordinator = false,
  onAssign,
}: EnquiryTableProps) {
  const [search, setSearch] = useState("");

  const filtered = enquiries.filter(
    (e) =>
      e.event_type.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase()) ||
      e.client?.name.toLowerCase().includes(search.toLowerCase())
  );

  const sourceIcons: Record<string, string> = {
    website: "🌐",
    whatsapp: "💬",
    email: "📧",
    instagram: "📸",
    referral: "🤝",
    walk_in: "🚶",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search enquiries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Client / Event
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Date & City
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Budget
                </th>
                {showCoordinator && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Coordinator
                  </th>
                )}
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Source
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                    No enquiries found
                  </td>
                </tr>
              ) : (
                filtered.map((enquiry, i) => (
                  <motion.tr
                    key={enquiry.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b last:border-0 hover:bg-accent/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{enquiry.client?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{enquiry.event_type}</p>
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
                            className="text-xs text-gold-600 hover:text-gold-700 font-medium border border-gold-300 rounded-lg px-2 py-0.5"
                          >
                            Assign
                          </button>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(enquiry.status)}`}
                      >
                        {getStatusLabel(enquiry.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-lg">
                      {sourceIcons[enquiry.source] ?? "—"}
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
