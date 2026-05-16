"use client";

import { motion } from "framer-motion";
import {
  Star,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Music,
  ArrowRight,
  IndianRupee,
  UserCog,
  FileText,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { StatCard } from "./StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArtistProfile, Booking } from "@/types";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ArtistOverviewProps {
  artistProfile: ArtistProfile | null;
  bookings: (Booking & {
    enquiry?: { event_type: string; client?: { name: string } };
  })[];
  totalEarnings: number;
  upcomingCount: number;
  completedCount: number;
}

export function ArtistOverview({
  artistProfile,
  bookings,
  totalEarnings,
  upcomingCount,
  completedCount,
}: ArtistOverviewProps) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const pendingRequests = bookings.filter((b) => b.status === "confirmed" && b.event_date >= today);
  const recent = bookings.slice(0, 5);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Profile completion alert */}
      {artistProfile && (!artistProfile.bio || artistProfile.categories.length === 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Complete your profile to get more bookings</p>
            <p className="text-xs text-amber-600 mt-0.5">Add bio, categories, pricing and photos</p>
          </div>
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-700"
            onClick={() => router.push("/artist/profile")}>
            Complete <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Earnings" value={formatCurrency(totalEarnings)} icon={IndianRupee} color="gold" index={0} />
        <StatCard title="Upcoming Events" value={upcomingCount} icon={Calendar} color="blue" index={1} />
        <StatCard title="Completed Events" value={completedCount} icon={CheckCircle2} color="green" index={2} />
        <StatCard title="Rating" value={`${(artistProfile?.rating ?? 0).toFixed(1)}/5`} icon={Star} color="purple" index={3} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: "Edit Profile",     href: "/artist/profile",      icon: UserCog,     color: "text-violet-600 bg-violet-50" },
          { label: "Set Availability", href: "/artist/availability", icon: Calendar,    color: "text-teal-600 bg-teal-50" },
          { label: "View Earnings",    href: "/artist/earnings",     icon: TrendingUp,  color: "text-emerald-600 bg-emerald-50" },
          { label: "Upload Docs",      href: "/artist/documents",    icon: FileText,    color: "text-amber-600 bg-amber-50" },
        ] as { label: string; href: string; icon: LucideIcon; color: string }[]).map((a) => {
          const Icon = a.icon;
          return (
          <Button
            key={a.label}
            variant="outline"
            className="h-auto flex-col gap-2 py-4 hover:border-gold-400 transition-colors"
            onClick={() => router.push(a.href)}
          >
            <div className={`w-10 h-10 rounded-xl ${a.color} flex items-center justify-center`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">{a.label}</span>
          </Button>
          );
        })}
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-gold-200 bg-gold-50/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-gold-500" />
              Booking Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between p-4 rounded-xl bg-white border border-gold-200 shadow-sm"
              >
                <div>
                  <p className="font-semibold text-sm">{b.enquiry?.event_type ?? "Event"}</p>
                  <p className="text-xs text-muted-foreground">{b.venue} · {b.city}</p>
                  <p className="text-xs text-gold-600 mt-0.5">{formatDate(b.event_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{formatCurrency(b.total_amount)}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="text-xs py-1 h-7 border-red-200 text-red-600">
                      Decline
                    </Button>
                    <Button size="sm" className="text-xs py-1 h-7">Accept</Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Bookings</CardTitle>
          <Button size="sm" variant="outline" onClick={() => router.push("/artist/bookings")}>View All</Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-10 text-center">
              <Music className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No bookings yet</p>
              <p className="text-xs text-muted-foreground mt-1">Complete your profile to start receiving bookings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{b.enquiry?.event_type ?? "Event"}</p>
                    <p className="text-xs text-muted-foreground">{b.venue} · {formatDate(b.event_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(b.total_amount)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(b.status)}`}>
                      {getStatusLabel(b.status)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
