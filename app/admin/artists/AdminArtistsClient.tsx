"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Star, CheckCircle2, XCircle, Phone, MapPin,
  Filter, X, Shield, ShieldOff, Eye, EyeOff, AlertCircle, Ban, FileText,
  LayoutGrid, Table2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArtistProfile, ArtistDocument } from "@/types";
import { formatCurrency, formatDateTime, getInitials } from "@/lib/utils";
import { CopyIconButton } from "@/components/ui/copy-icon-button";
import { db } from "@/lib/firebase/client";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { notifyUser, notifyUserInBatch, emailUser } from "@/lib/notifications/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface ArtistWithUser extends Omit<ArtistProfile, "user"> {
  user: { name: string; email: string; phone: string; is_active: boolean; avatar_url?: string };
  profile_completion_percent?: number;
  documents?: ArtistDocument[];
  created_at?: string;
}

const VERIFY_TABS = [
  { key: "all",        label: "All Artists" },
  { key: "unverified", label: "Pending Verification" },
  { key: "verified",   label: "Verified" },
];

const LIST_TABS = [
  { key: "all",     label: "All visibility" },
  { key: "listed",  label: "Listed for clients" },
  { key: "unlisted", label: "Hidden from browse" },
];

function isListedProfile(a: ArtistWithUser) {
  return a.is_listed !== false;
}

function uniqueCities(artists: ArtistWithUser[]) {
  const s = new Set<string>();
  artists.forEach((a) => (a.cities ?? []).forEach((c) => s.add(c)));
  return Array.from(s).sort();
}

function uniqueAreas(artists: ArtistWithUser[], cityFilter: string) {
  const pool = cityFilter ? artists.filter((a) => (a.cities ?? []).includes(cityFilter)) : artists;
  const s = new Set<string>();
  pool.forEach((a) => { if (a.area) s.add(a.area); });
  return Array.from(s).sort();
}

const PAGE_SIZES = [10, 25, 50, 100];

export function ArtistVerificationClient({
  artists, categories, canManageListing = true,
}: { artists: ArtistWithUser[]; categories: string[]; canManageListing?: boolean }) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [verifyTab, setVerifyTab] = useState("all");
  const [listTab, setListTab] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  // Chip-search text, purely to narrow which chips render below (the filter
  // panel's own category/city/area lists can get long) — separate from the
  // main search box, which filters the artist list itself.
  const [catChipQuery, setCatChipQuery] = useState("");
  const [cityChipQuery, setCityChipQuery] = useState("");
  const [areaChipQuery, setAreaChipQuery] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [listingToggling, setListingToggling] = useState<string | null>(null);
  const [reminding, setReminding] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ArtistWithUser | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const resetPage = () => setPage(1);

  const allCities = uniqueCities(artists);
  const allAreas = uniqueAreas(artists, cityFilter);

  const unverifiedCount = artists.filter((a) => !a.is_verified).length;
  const hiddenCount = artists.filter((a) => a.is_listed === false).length;
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"verify" | "list" | "">("");
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const toggleBulkSelect = (id: string) =>
    setBulkSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const confirmBulkAction = async () => {
    if (!bulkAction || bulkSelected.size === 0) return;
    setBulkProcessing(true);
    const ids = Array.from(bulkSelected);
    const batch = writeBatch(db);
    const field = bulkAction === "verify" ? "is_verified" : "is_listed";
    const payload = bulkAction === "verify"
      ? { title: "You're Verified! 🎉", message: "Great news — your artist profile has been verified by our team and can now appear in client and coordinator searches.", type: "success" as const, link: "/artist/profile" }
      : { title: "Profile Listed", message: "Your profile is now listed and can appear in client and coordinator searches once verified.", type: "success" as const, link: "/artist/profile" };
    for (const id of ids) {
      // Bulk-verifying also clears any earlier rejection, same as the
      // single verify button — otherwise a stale rejection_reason could
      // resurface if this artist is ever unverified again later.
      batch.update(doc(db, "artistProfiles", id), {
        [field]: true,
        ...(bulkAction === "verify" && { rejection_reason: null }),
      });
      notifyUserInBatch(batch, id, payload);
    }
    await batch.commit();
    if (bulkAction === "verify") {
      ids.forEach((id) => emailUser(id, payload).catch(() => {}));
    }
    toast.success(bulkAction === "verify"
      ? `${ids.length} artist${ids.length > 1 ? "s" : ""} verified`
      : `${ids.length} artist${ids.length > 1 ? "s" : ""} listed`);
    setBulkSelected(new Set());
    setBulkAction("");
    setBulkProcessing(false);
    router.refresh();
  };

  const filtered = artists.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch =
      a.user.name.toLowerCase().includes(q) ||
      a.user.email.toLowerCase().includes(q) ||
      (a.cities ?? []).some((c) => c.toLowerCase().includes(q)) ||
      (a.area ?? "").toLowerCase().includes(q) ||
      (a.categories ?? []).some((c) => c.toLowerCase().includes(q));

    const matchesVerify =
      verifyTab === "all" ? true :
      verifyTab === "verified" ? a.is_verified :
      !a.is_verified;

    const matchesList =
      listTab === "all" ? true :
      listTab === "listed" ? isListedProfile(a) :
      !isListedProfile(a);

    const matchesCategory = !categoryFilter || a.categories.includes(categoryFilter);
    const matchesCity = !cityFilter || (a.cities ?? []).includes(cityFilter);
    const matchesArea = !areaFilter || a.area === areaFilter;

    return matchesSearch && matchesVerify && matchesList && matchesCategory && matchesCity && matchesArea;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const toggleVerify = async (artistId: string, current: boolean) => {
    setToggling(artistId);
    try {
      // Verifying also clears any earlier rejection — a fresh approval
      // shouldn't leave a stale "Rejected: ..." note on the card.
      await updateDoc(doc(db, "artistProfiles", artistId), {
        is_verified: !current,
        ...(!current && { rejection_reason: null }),
      });
      const payload = current
        ? {
            title: "Verification Removed",
            message: "Your artist verification has been removed, so your profile won't appear in client or coordinator searches until it's restored.",
            type: "warning" as const,
            link: "/artist/profile",
          }
        : {
            title: "You're Verified! 🎉",
            message: "Great news — your artist profile has been verified by our team and can now appear in client and coordinator searches.",
            type: "success" as const,
            link: "/artist/profile",
          };
      await notifyUser(artistId, payload).catch(() => {});
      if (!current) emailUser(artistId, payload).catch(() => {});
      toast.success(current ? "Artist unverified" : "Artist verified!");
    } catch {
      toast.error("Failed to update");
    }
    setToggling(null);
    router.refresh();
  };

  const toggleListed = async (artistId: string, currentListed: boolean) => {
    setListingToggling(artistId);
    try {
      await updateDoc(doc(db, "artistProfiles", artistId), { is_listed: !currentListed });
      await notifyUser(artistId, currentListed
        ? {
            title: "Profile Hidden",
            message: "Your profile has been hidden from client and coordinator searches by our team.",
            type: "warning",
            link: "/artist/profile",
          }
        : {
            title: "Profile Listed",
            message: "Your profile is now listed and can appear in client and coordinator searches once verified.",
            type: "success",
            link: "/artist/profile",
          }
      ).catch(() => {});
      if (!currentListed) {
        const a = artists.find((x) => x.id === artistId);
        if (a?.is_verified) {
          toast.success("Artist listed and now visible to clients & coordinators.");
        } else {
          toast.success("Listed. They'll appear in searches once also verified.");
        }
      } else {
        toast.success("Artist hidden from client & coordinator browse");
      }
    } catch {
      toast.error("Failed to update visibility");
    }
    setListingToggling(null);
    router.refresh();
  };

  const confirmReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) { toast.error("Enter a reason"); return; }
    setRejecting(true);
    try {
      const reason = rejectReason.trim();
      await updateDoc(doc(db, "artistProfiles", rejectTarget.id), {
        is_verified: false,
        rejection_reason: reason,
      });
      const payload = {
        title: "Your artist profile needs a few changes",
        message: `We reviewed your profile but couldn't verify it yet. Here's what needs attention: "${reason}". Update your profile and we'll take another look — you don't need to wait for us, we're notified automatically as soon as you save.`,
        type: "warning" as const,
        link: "/artist/profile",
      };
      await notifyUser(rejectTarget.id, payload).catch(() => {});
      emailUser(rejectTarget.id, payload).catch(() => {});
      toast.success("Artist notified with feedback");
      setRejectTarget(null);
      setRejectReason("");
    } catch {
      toast.error("Failed to reject");
    }
    setRejecting(false);
    router.refresh();
  };

  const sendProfileReminder = async (artistId: string, name: string) => {
    setReminding(artistId);
    try {
      const ok = await emailUser(artistId, {
        title: "Complete your profile to get verified",
        message: `Hi ${name}, your profile still needs a bit more before we can review and verify it. Once it's complete, our team is notified automatically — no need to wait on us.`,
        link: "/artist/profile",
      });
      if (ok) {
        toast.success("Reminder sent");
      } else {
        toast.error("Failed to send reminder");
      }
    } catch {
      toast.error("Failed to send reminder");
    }
    setReminding(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Verification tabs */}
      <div className="flex gap-2 border-b pb-1">
        {VERIFY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setVerifyTab(tab.key); resetPage(); }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2 ${
              verifyTab === tab.key
                ? "text-navy-700 border-b-2 border-navy-600"
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

      {/* Directory listing (clients & coordinators) */}
      {canManageListing && (
      <div className="flex gap-2 border-b pb-1 -mt-1">
        {LIST_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setListTab(tab.key); resetPage(); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 ${
              listTab === tab.key
                ? "text-slate-900 bg-slate-100"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.key === "unlisted" && hiddenCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                {hiddenCount}
              </span>
            )}
          </button>
        ))}
      </div>
      )}

      {/* Search + category filter */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, category or location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            className="pl-9"
          />
        </div>
        <Button
          variant={showCategoryFilter ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCategoryFilter((v) => !v)}
        >
          <Filter className="w-4 h-4 mr-1.5" />Filters
          {(categoryFilter || cityFilter || areaFilter) && <span className="ml-1.5 w-2 h-2 rounded-full bg-white inline-block" />}
        </Button>
        {(categoryFilter || cityFilter || areaFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setCategoryFilter(""); setCityFilter(""); setAreaFilter(""); resetPage(); }}>
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
            <div className="p-3 rounded-xl bg-muted/20 border space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Category</p>
                {categories.length > 6 && (
                  <Input
                    placeholder="Search categories…"
                    value={catChipQuery}
                    onChange={(e) => setCatChipQuery(e.target.value)}
                    className="h-8 text-sm mb-2"
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  {categories.filter((cat) => cat.toLowerCase().includes(catChipQuery.toLowerCase())).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setCategoryFilter((prev) => prev === cat ? "" : cat); resetPage(); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        categoryFilter === cat
                          ? "bg-navy-600 text-white border-navy-600"
                          : "bg-background border-border text-muted-foreground hover:border-navy-400"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">City</p>
                {allCities.length > 6 && (
                  <Input
                    placeholder="Search cities…"
                    value={cityChipQuery}
                    onChange={(e) => setCityChipQuery(e.target.value)}
                    className="h-8 text-sm mb-2"
                  />
                )}
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                  {allCities.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No cities on file yet</p>
                  ) : allCities.filter((c) => c.toLowerCase().includes(cityChipQuery.toLowerCase())).map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCityFilter((prev) => prev === c ? "" : c); setAreaFilter(""); resetPage(); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        cityFilter === c
                          ? "bg-gold-600 text-white border-gold-600"
                          : "bg-background border-border text-muted-foreground hover:border-gold-400"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Area / Locality</p>
                {allAreas.length > 6 && (
                  <Input
                    placeholder="Search areas…"
                    value={areaChipQuery}
                    onChange={(e) => setAreaChipQuery(e.target.value)}
                    className="h-8 text-sm mb-2"
                  />
                )}
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                  {allAreas.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{cityFilter ? "No areas on file for this city" : "No areas on file yet"}</p>
                  ) : allAreas.filter((ar) => ar.toLowerCase().includes(areaChipQuery.toLowerCase())).map((ar) => (
                    <button
                      key={ar}
                      onClick={() => { setAreaFilter((prev) => prev === ar ? "" : ar); resetPage(); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        areaFilter === ar
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-background border-border text-muted-foreground hover:border-emerald-400"
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {artists.length} artists
        </p>
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === "table" ? "bg-navy-900 text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === "grid" ? "bg-navy-900 text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />Grid
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No artists match your filters</p>
        </div>
      ) : (
        <>
          {/* Bulk action bar */}
          {bulkSelected.size > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-navy-50 border border-navy-200">
              <span className="text-sm font-medium text-navy-800">{bulkSelected.size} artist{bulkSelected.size > 1 ? "s" : ""} selected</span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value as "verify" | "list" | "")}
                className="flex-1 max-w-[180px] h-8 rounded-lg border border-navy-200 text-sm px-2 bg-white text-navy-900"
              >
                <option value="">Choose action…</option>
                <option value="verify">Verify all</option>
                {canManageListing && <option value="list">List all (show on browse)</option>}
              </select>
              <Button size="sm" variant="secondary" disabled={!bulkAction || bulkProcessing} onClick={confirmBulkAction}>
                {bulkProcessing ? "Processing…" : "Apply"}
              </Button>
              <button onClick={() => setBulkSelected(new Set())} className="text-xs text-navy-500 underline hover:text-navy-700">Clear</button>
            </div>
          )}
          {viewMode === "table" ? (
          <>
          <div className="rounded-2xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-xs font-semibold text-muted-foreground uppercase text-left">
                    <th className="px-3 py-2.5 w-8"></th>
                    <th className="px-3 py-2.5 min-w-[200px]">Artist</th>
                    <th className="px-3 py-2.5 min-w-[130px]">Phone</th>
                    <th className="px-3 py-2.5 min-w-[160px]">Categories</th>
                    <th className="px-3 py-2.5 min-w-[160px]">Location</th>
                    <th className="px-3 py-2.5 min-w-[90px]">Rating</th>
                    <th className="px-3 py-2.5 min-w-[100px]">Price</th>
                    <th className="px-3 py-2.5 min-w-[90px]">Profile</th>
                    <th className="px-3 py-2.5 min-w-[110px]">Status</th>
                    <th className="px-3 py-2.5 min-w-[100px]">Documents</th>
                    <th className="px-3 py-2.5 min-w-[100px]">Registered</th>
                    <th className="px-3 py-2.5 min-w-[120px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((artist) => {
                    const hasAadhaar = (artist.documents ?? []).some((d) => d.type === "Aadhaar Card");
                    return (
                      <tr
                        key={artist.id}
                        className={`border-b last:border-0 hover:bg-accent/20 transition-colors ${
                          bulkSelected.has(artist.user_id) ? "bg-navy-50/60" : ""
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={bulkSelected.has(artist.user_id)}
                            onChange={() => toggleBulkSelect(artist.user_id)}
                            className="w-4 h-4 rounded border-gray-300 text-navy-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              artist.is_verified ? "gold-gradient text-navy-900" : "bg-muted text-muted-foreground"
                            }`}>
                              {getInitials(artist.user.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 min-w-0">
                                <p className="font-medium truncate max-w-[160px]">{artist.user.name}</p>
                                <CopyIconButton value={artist.user.name} label="Name" />
                              </div>
                              <div className="flex items-center gap-1 min-w-0">
                                <p className="text-xs text-muted-foreground truncate max-w-[160px]">{artist.user.email}</p>
                                <CopyIconButton value={artist.user.email} label="Email" />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {artist.user.phone}
                            <CopyIconButton value={artist.user.phone} label="Phone" />
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {artist.categories.slice(0, 2).map((c) => (
                              <Badge key={c} variant="secondary" className="text-[10px] py-0">{c}</Badge>
                            ))}
                            {artist.categories.length > 2 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] py-0 cursor-default">+{artist.categories.length - 2}</Badge>
                                </TooltipTrigger>
                                <TooltipContent>{artist.categories.slice(2).join(", ")}</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {(artist.cities ?? []).length > 0 ? (
                            <div className="flex items-center gap-1 max-w-[180px]">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{artist.cities.slice(0, 2).join(", ")}</span>
                              {artist.cities.length > 2 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-medium underline decoration-dotted underline-offset-2 cursor-default flex-shrink-0">
                                      +{artist.cities.length - 2}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>{artist.cities.slice(2).join(", ")}</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-semibold">{artist.rating.toFixed(1)}</span>
                            <span className="text-muted-foreground">({artist.total_bookings})</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-semibold text-navy-700 whitespace-nowrap">{formatCurrency(artist.base_price)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${
                            (artist.profile_completion_percent ?? 0) >= 100 ? "bg-navy-100 text-navy-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {artist.profile_completion_percent ?? 0}%
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => toggleVerify(artist.id, artist.is_verified)}
                                  disabled={toggling === artist.id}
                                  aria-label={artist.is_verified ? `Remove verification from ${artist.user.name}` : `Verify ${artist.user.name}`}
                                  className="disabled:opacity-50"
                                >
                                  {artist.is_verified ? (
                                    <Shield className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <ShieldOff className="w-4 h-4 text-amber-600" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">{artist.is_verified ? "Verified — click to remove" : "Not verified — click to verify"}</TooltipContent>
                            </Tooltip>
                            {canManageListing && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => toggleListed(artist.id, isListedProfile(artist))}
                                    disabled={listingToggling === artist.id}
                                    aria-label={isListedProfile(artist) ? `Hide ${artist.user.name}` : `List ${artist.user.name}`}
                                    className="disabled:opacity-50"
                                  >
                                    {isListedProfile(artist) ? (
                                      <Eye className="w-4 h-4 text-blue-500" />
                                    ) : (
                                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">{isListedProfile(artist) ? "Listed — click to hide" : "Hidden — click to list"}</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {hasAadhaar ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium whitespace-nowrap">
                              {(artist.documents ?? []).length} uploaded
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium whitespace-nowrap">
                              Aadhaar missing
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {artist.created_at ? formatDateTime(artist.created_at) : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {(!artist.is_profile_complete || !artist.is_verified) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    aria-label={`Remind ${artist.user.name} to complete profile`}
                                    disabled={reminding === artist.id}
                                    onClick={() => sendProfileReminder(artist.id, artist.user.name)}
                                  >
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Remind to complete profile</TooltipContent>
                              </Tooltip>
                            )}
                            {!artist.is_verified && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    aria-label={`Reject ${artist.user.name}`}
                                    onClick={() => { setRejectTarget(artist); setRejectReason(""); }}
                                  >
                                    <Ban className="w-4 h-4 text-red-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Reject with feedback</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {filtered.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length}
              </span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); resetPage(); }}>
                <SelectTrigger className="h-8 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          </>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((artist, i) => (
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl border p-4 hover:shadow-md transition-all relative ${
                bulkSelected.has(artist.user_id) ? "ring-2 ring-navy-400" : ""
              } ${!artist.is_verified ? "border-amber-200 bg-amber-50/20" : ""
              } ${!isListedProfile(artist) ? "border-dashed border-slate-300 bg-slate-50/50" : ""}`}
            >
              {/* Bulk checkbox */}
              <input
                type="checkbox"
                checked={bulkSelected.has(artist.user_id)}
                onChange={() => toggleBulkSelect(artist.user_id)}
                className="absolute top-3 left-3 w-4 h-4 rounded border-gray-300 text-navy-600 cursor-pointer z-10"
              />
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3 pl-6">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    artist.is_verified ? "gold-gradient text-navy-900" : "bg-muted text-muted-foreground"
                  }`}>
                    {getInitials(artist.user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{artist.user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{artist.user.email}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  {artist.is_verified ? (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                      <XCircle className="w-3 h-3" />Pending
                    </span>
                  )}
                  <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    (artist.profile_completion_percent ?? 0) >= 100
                      ? "bg-navy-100 text-navy-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {artist.profile_completion_percent ?? 0}% filled
                  </span>
                  {isListedProfile(artist) ? (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                      <Eye className="w-3 h-3" />Listed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                      <EyeOff className="w-3 h-3" />Hidden
                    </span>
                  )}
                </div>
              </div>

              {artist.rejection_reason && !artist.is_verified && (
                <div className="mb-3 p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800">
                  <span className="font-semibold">Rejected: </span>{artist.rejection_reason}
                </div>
              )}

              {/* Documents — private, only admin/coordinator/owner can view (storage.rules + firestore.rules) */}
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Documents</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(artist.documents ?? []).length === 0 ? (
                    <span className="text-[10px] text-red-600 font-medium">No documents uploaded</span>
                  ) : (
                    <>
                      {(artist.documents ?? []).map((docItem) => (
                        <a
                          key={docItem.id}
                          href={docItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100 hover:bg-blue-100"
                        >
                          <FileText className="w-3 h-3" />{docItem.type}
                        </a>
                      ))}
                      {!(artist.documents ?? []).some((d) => d.type === "Aadhaar Card") && (
                        <span className="text-[10px] text-red-600 font-medium">Aadhaar missing</span>
                      )}
                    </>
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
                    <MapPin className="w-3 h-3" />
                    <span>{artist.cities.slice(0, 3).join(", ")}</span>
                    {artist.cities.length > 3 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-medium underline decoration-dotted underline-offset-2 cursor-default">
                            &nbsp;+{artist.cities.length - 3}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{artist.cities.slice(3).join(", ")}</TooltipContent>
                      </Tooltip>
                    )}
                    {artist.area && <span>&nbsp;· {artist.area}</span>}
                  </div>
                )}
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-1 mb-3">
                {artist.categories.slice(0, 3).map((c) => (
                  <Badge key={c} variant="secondary" className="text-[10px] py-0">{c}</Badge>
                ))}
                {artist.categories.length > 3 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[10px] py-0 cursor-default">+{artist.categories.length - 3}</Badge>
                    </TooltipTrigger>
                    <TooltipContent>{artist.categories.slice(3).join(", ")}</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Languages */}
              {artist.languages && artist.languages.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {artist.languages.map((l) => (
                    <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{l}</span>
                  ))}
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center justify-between text-xs border-t pt-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{artist.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-muted-foreground">{artist.total_bookings} bookings</span>
                </div>
                <span className="font-semibold text-navy-700">{formatCurrency(artist.base_price)}</span>
              </div>

              {/* Actions */}
              <div className="space-y-2 mt-3">
                {(!artist.is_profile_complete || !artist.is_verified) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                    disabled={reminding === artist.id}
                    onClick={() => sendProfileReminder(artist.id, artist.user.name)}
                  >
                    {reminding === artist.id ? (
                      <span className="flex items-center gap-2 justify-center">
                        <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        Sending…
                      </span>
                    ) : (
                      <><AlertCircle className="w-3.5 h-3.5 mr-1.5" />Remind to Complete Profile</>
                    )}
                  </Button>
                )}
                {canManageListing && (
                <Button
                  size="sm"
                  variant={isListedProfile(artist) ? "outline" : "secondary"}
                  className={`w-full ${isListedProfile(artist) ? "border-slate-300" : ""}`}
                  disabled={listingToggling === artist.id}
                  onClick={() => toggleListed(artist.id, isListedProfile(artist))}
                >
                  {listingToggling === artist.id ? (
                    <span className="flex items-center gap-2 justify-center">
                      <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Updating…
                    </span>
                  ) : isListedProfile(artist) ? (
                    <><EyeOff className="w-3.5 h-3.5 mr-1.5" />Hide from clients & coordinators</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5 mr-1.5" />List for clients & coordinators</>
                  )}
                </Button>
                )}
                {artist.is_verified ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50"
                    disabled={toggling === artist.id}
                    onClick={() => toggleVerify(artist.id, artist.is_verified)}
                  >
                    {toggling === artist.id ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        Updating...
                      </span>
                    ) : (
                      <><ShieldOff className="w-3.5 h-3.5 mr-1.5" />Remove Verification</>
                    )}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      className="flex-1"
                      disabled={toggling === artist.id}
                      onClick={() => toggleVerify(artist.id, artist.is_verified)}
                    >
                      {toggling === artist.id ? (
                        <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      ) : (
                        <><Shield className="w-3.5 h-3.5 mr-1.5" />Verify</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => { setRejectTarget(artist); setRejectReason(""); }}
                    >
                      <Ban className="w-3.5 h-3.5 mr-1.5" />Reject
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          </div>
          )}
        </>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject {rejectTarget?.user.name}&apos;s profile</DialogTitle>
          </DialogHeader>
          {rejectTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Explain what needs to change — this is emailed to the artist directly, and their profile is
                automatically resubmitted for review the next time they save it.
              </p>
              <Textarea
                placeholder="e.g. Profile photo is too blurry, please upload a clearer one."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={confirmReject}
                  loading={rejecting}
                  disabled={!rejectReason.trim()}
                >
                  <Ban className="w-4 h-4 mr-2" />Reject & Notify
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
