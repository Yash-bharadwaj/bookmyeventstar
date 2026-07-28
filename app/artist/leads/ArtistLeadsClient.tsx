"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, IndianRupee, ThumbsUp, X, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { db } from "@/lib/firebase/client";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { notifyUser, notifyAllAdmins, emailUser } from "@/lib/notifications/client";
import toast from "react-hot-toast";

interface Lead {
  id: string;
  enquiry_id: string;
  event_type: string;
  event_date: string;
  city: string;
  budget_max: number;
  status: "notified" | "interested" | "dismissed";
  coordinator_id: string | null;
}

export function ArtistLeadsClient({
  leads,
  artistName,
  artistPhone,
  artistEmail,
}: {
  leads: Lead[];
  artistName: string;
  artistPhone: string;
  artistEmail: string;
}) {
  const [items, setItems] = useState(leads);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleInterested = async (lead: Lead) => {
    setBusyId(lead.id);
    try {
      await updateDoc(doc(db, "artistLeads", lead.id), {
        status: "interested",
        updated_at: serverTimestamp(),
      });

      const payload = {
        title: "Artist interested in an enquiry",
        message: `${artistName} is interested in the ${lead.event_type} enquiry in ${lead.city}. Contact them directly at ${artistPhone} or ${artistEmail} to discuss next steps.`,
        type: "success" as const,
        link: `/coordinator/enquiries/${lead.enquiry_id}`,
      };
      if (lead.coordinator_id) {
        await notifyUser(lead.coordinator_id, payload);
        emailUser(lead.coordinator_id, payload).catch(() => {});
      } else {
        await notifyAllAdmins(payload);
      }

      setItems((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: "interested" } : l)));
      toast.success("Thanks! We've let the team know you're interested.");
    } catch {
      toast.error("Something went wrong — please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (lead: Lead) => {
    setBusyId(lead.id);
    try {
      await updateDoc(doc(db, "artistLeads", lead.id), {
        status: "dismissed",
        updated_at: serverTimestamp(),
      });
      setItems((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: "dismissed" } : l)));
      toast("Got it, we won't bug you about this one.");
    } catch {
      toast.error("Something went wrong — please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold text-navy-900">Event Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          New enquiries that match your city, style, and price — let us know if you'd like to be considered.
        </p>
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="py-14 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-navy-900">No leads yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                When a new enquiry matches your profile, it'll show up here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {items.map((lead) => (
        <motion.div key={lead.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={lead.status !== "notified" ? "opacity-60" : ""}>
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-navy-900">{lead.event_type}</p>
                  {lead.status === "interested" && (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                      You're interested
                    </span>
                  )}
                  {lead.status === "dismissed" && (
                    <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      Dismissed
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{lead.city}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(lead.event_date)}</span>
                  <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />Up to {formatCurrency(lead.budget_max)}</span>
                </div>
              </div>

              {lead.status === "notified" && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === lead.id}
                    onClick={() => handleDismiss(lead)}
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    Not for me
                  </Button>
                  <Button
                    size="sm"
                    loading={busyId === lead.id}
                    onClick={() => handleInterested(lead)}
                  >
                    <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                    I&apos;m Interested
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
