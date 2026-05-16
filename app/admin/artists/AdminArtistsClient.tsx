"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Star, CheckCircle2, XCircle, Phone, MapPin,
  Filter, X, Shield, ShieldOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArtistProfile } from "@/types";
import { formatCurrency, getInitials, ARTIST_CATEGORIES } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface ArtistWithUser extends Omit<ArtistProfile, "user"> {
  user: { name: string; email: string; phone: string; is_active: boolean; avatar_url?: string };
}

const VERIFY_TABS = [
  { key: "all",        label: "All Artists" },
  { key: "unverified", label: "Pending Verification" },
  { key: "verified",   label: "Verified" },
];

export function AdminArtistsClient({ artists }: { artists: ArtistWithUser[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [verifyTab, setVerifyTab] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const unverifiedCount = artists.filter((a) => !a.is_verified).length;

  const filtered = artists.filter((a) => {
    const matchesSearch =
      a.user.name.toLowerCase().includes(search.toLowerCase()) ||
      a.user.email.toLowerCase().includes(search.toLowerCase()) ||
      (a.cities ?? []).some((c) => c.toLowerCase().includes(search.toLowerCase()));

    const matchesVerify =
      verifyTab === "all" ? true :
      verifyTab === "verified" ? a.is_verified :
      !a.is_verified;

    const matchesCategory = !categoryFilter || a.categories.includes(categoryFilter);

    return matchesSearch && matchesVerify && matchesCategory;
  });

  const toggleVerify = async (artistId: string, current: boolean) => {
    setToggling(artistId);
    const supabase = createClient();
    const { error } = await supabase
      .from("artist_profiles")
      .update({ is_verified: !current })
      .eq("id", artistId);
    if (error) toast.error("Failed to update");
    else toast.success(current ? "Artist unverified" : "Artist verified!");
    setToggling(null);
    router.refresh();
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Verification tabs */}
      <div className="flex gap-2 border-b pb-1">
        {VERIFY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setVerifyTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2 ${
              verifyTab === tab.key
                ? "text-indigo-700 border-b-2 border-indigo-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.key === "unverified" && unverifiedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                {unverifiedCount}
              </span>
            )}
            {tab.key === "all" && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                {artists.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + category filter */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showCategoryFilter ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCategoryFilter((v) => !v)}
        >
          <Filter className="w-4 h-4 mr-1.5" />Category
          {categoryFilter && <span className="ml-1.5 w-2 h-2 rounded-full bg-white inline-block" />}
        </Button>
        {categoryFilter && (
          <Button variant="ghost" size="sm" onClick={() => setCategoryFilter("")}>
            <X className="w-3.5 h-3.5 mr-1" />Clear
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showCategoryFilter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-muted/20 border">
              {ARTIST_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoryFilter((prev) => prev === cat ? "" : cat);
                    setShowCategoryFilter(false);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    categoryFilter === cat
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-background border-border text-muted-foreground hover:border-indigo-400"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {artists.length} artists
      </p>

      {/* Artists grid (cards instead of plain table for better readability) */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No artists match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((artist, i) => (
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl border p-4 hover:shadow-md transition-all ${
                !artist.is_verified ? "border-amber-200 bg-amber-50/20" : ""
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    artist.is_verified ? "gold-gradient text-navy-900" : "bg-muted text-muted-foreground"
                  }`}>
                    {getInitials(artist.user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{artist.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{artist.user.email}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {artist.is_verified ? (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                      <XCircle className="w-3 h-3" />Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" />{artist.user.phone}
                </div>
                {(artist.cities ?? []).length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />{artist.cities.slice(0, 3).join(", ")}
                    {artist.cities.length > 3 && ` +${artist.cities.length - 3}`}
                  </div>
                )}
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-1 mb-3">
                {artist.categories.slice(0, 3).map((c) => (
                  <Badge key={c} variant="secondary" className="text-[10px] py-0">{c}</Badge>
                ))}
                {artist.categories.length > 3 && (
                  <Badge variant="outline" className="text-[10px] py-0">+{artist.categories.length - 3}</Badge>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between text-xs border-t pt-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{artist.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-muted-foreground">{artist.total_bookings} bookings</span>
                </div>
                <span className="font-semibold text-indigo-700">{formatCurrency(artist.base_price)}</span>
              </div>

              {/* Action */}
              <Button
                size="sm"
                variant={artist.is_verified ? "outline" : "default"}
                className={`w-full mt-3 ${artist.is_verified ? "border-red-200 text-red-600 hover:bg-red-50" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                disabled={toggling === artist.id}
                onClick={() => toggleVerify(artist.id, artist.is_verified)}
              >
                {toggling === artist.id ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Updating...
                  </span>
                ) : artist.is_verified ? (
                  <><ShieldOff className="w-3.5 h-3.5 mr-1.5" />Remove Verification</>
                ) : (
                  <><Shield className="w-3.5 h-3.5 mr-1.5" />Verify Artist</>
                )}
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
