"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Star, MapPin, IndianRupee, CheckCircle2, Check, Plus, X,
  SlidersHorizontal, ArrowUpDown, Phone, Mail,
  Calendar, Sparkles, ArrowRight, Mic2, Send,
  User, Award, BookOpen, ImageIcon, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, getInitials, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Artist {
  id: string; categories: string[]; cities: string[]; base_price: number;
  rating: number; total_bookings: number; bio?: string;
  is_verified: boolean; experience_years?: number;
  user: { name: string; email: string; phone: string; avatar_url?: string } | null;
  media: { url: string; is_primary: boolean; type: string }[];
}

interface EnquiryCtx {
  id: string; event_type: string; event_date: string; city: string;
  budget_min: number; budget_max: number;
  client?: { name: string } | null;
}

interface Props { artists: Artist[]; enquiries: EnquiryCtx[]; allCategories: string[]; }

type SortKey = "rating" | "price_asc" | "price_desc" | "bookings";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rating",     label: "Top Rated" },
  { value: "price_asc",  label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "bookings",   label: "Most Booked" },
];

// derive all unique cities from artist data
function uniqueCities(artists: Artist[]) {
  const s = new Set<string>();
  artists.forEach((a) => a.cities.forEach((c) => s.add(c)));
  return Array.from(s).sort();
}

export function ArtistSearchClient({ artists, enquiries, allCategories }: Props) {
  const router = useRouter();

  // ── Enquiry context ──
  const [enquiryId, setEnquiryId] = useState<string>(enquiries[0]?.id ?? "");
  const enquiry = useMemo(() => enquiries.find((e) => e.id === enquiryId) ?? null, [enquiryId, enquiries]);

  // ── Filter state ──
  const [search, setSearch]               = useState("");
  const [categories, setCategories]       = useState<string[]>([]);
  const [cities, setCities]               = useState<string[]>([]);
  const [minRating, setMinRating]         = useState(0);
  const [maxPrice, setMaxPrice]           = useState<number | "">("");
  const [minPrice, setMinPrice]           = useState<number | "">("");
  const [sortBy, setSortBy]               = useState<SortKey>("rating");
  const [verifiedOnly, setVerifiedOnly]   = useState(false);
  const [showFilters, setShowFilters]     = useState(true);
  const [shortlisted, setShortlisted]     = useState<Set<string>>(new Set());
  const [profileArtist, setProfileArtist] = useState<Artist | null>(null);
  const [photoIdx, setPhotoIdx]           = useState(0);

  const allCities = useMemo(() => uniqueCities(artists), [artists]);

  // ── When enquiry changes, auto-apply its city + budget ──
  const applyEnquiryContext = (id: string) => {
    setEnquiryId(id);
    const e = enquiries.find((x) => x.id === id);
    if (e) {
      setCities([e.city]);
      setMaxPrice(e.budget_max);
      setMinPrice(0);
    }
  };

  const toggleCategory = (c: string) =>
    setCategories((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const toggleCity = (c: string) =>
    setCities((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const toggleShortlist = (id: string) =>
    setShortlisted((prev) => { const n = new Set(Array.from(prev)); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const clearAllFilters = () => {
    setSearch(""); setCategories([]); setCities([]);
    setMinRating(0); setMinPrice(""); setMaxPrice(""); setVerifiedOnly(false);
  };

  const activeFilterCount = [
    search, ...categories, ...cities,
    minRating > 0, minPrice !== "" && minPrice > 0, maxPrice !== "",
    verifiedOnly,
  ].filter(Boolean).length;

  // ── Filtering + sorting ──
  const filtered = useMemo(() => {
    let list = artists.filter((a) => {
      const name = a.user?.name ?? "";
      const matchSearch = !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        a.categories.some((c) => c.toLowerCase().includes(search.toLowerCase())) ||
        a.bio?.toLowerCase().includes(search.toLowerCase());

      const matchCat = categories.length === 0 || categories.some((c) => a.categories.includes(c));
      const matchCity = cities.length === 0 || cities.some((c) => a.cities.includes(c));
      const matchRating = a.rating >= minRating;
      const matchMinPrice = minPrice === "" || a.base_price >= Number(minPrice);
      const matchMaxPrice = maxPrice === "" || a.base_price <= Number(maxPrice);
      const matchVerified = !verifiedOnly || a.is_verified;

      return matchSearch && matchCat && matchCity && matchRating && matchMinPrice && matchMaxPrice && matchVerified;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "rating")     return b.rating - a.rating;
      if (sortBy === "price_asc")  return a.base_price - b.base_price;
      if (sortBy === "price_desc") return b.base_price - a.base_price;
      if (sortBy === "bookings")   return b.total_bookings - a.total_bookings;
      return 0;
    });

    return list;
  }, [artists, search, categories, cities, minRating, minPrice, maxPrice, verifiedOnly, sortBy]);

  const shortlistedArtists = artists.filter((a) => shortlisted.has(a.id));

  const goToCreateProposal = () => {
    if (!enquiryId) { alert("Please select an enquiry first"); return; }
    // Store shortlisted IDs in localStorage so the proposals page can pre-fill
    localStorage.setItem("shortlisted_artists", JSON.stringify(Array.from(shortlisted)));
    localStorage.setItem("shortlisted_enquiry", enquiryId);
    router.push("/coordinator/proposals");
  };

  const primaryPhoto = (a: Artist) => a.media.find((m) => m.is_primary && m.type === "photo")?.url;

  return (
    <div className="p-4 md:p-6 space-y-4">

      {/* ── Enquiry context selector ── */}
      {enquiries.length > 0 && (
        <div className="rounded-2xl border bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-100 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <p className="text-sm font-semibold text-indigo-800">Shortlisting for which enquiry?</p>
          </div>
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[220px]">
              <Select value={enquiryId} onValueChange={applyEnquiryContext}>
                <SelectTrigger className="bg-white border-indigo-200">
                  <SelectValue placeholder="Select enquiry…" />
                </SelectTrigger>
                <SelectContent>
                  {enquiries.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="font-medium">{e.event_type}</span>
                      <span className="text-muted-foreground text-xs ml-2">· {e.client?.name} · {e.city} · {formatDate(e.event_date)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {enquiry && (
              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-medium text-indigo-700 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />{formatDate(enquiry.event_date)}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-medium text-indigo-700 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />{enquiry.city}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                  <IndianRupee className="w-3 h-3" />Budget: {formatCurrency(enquiry.budget_min)} – {formatCurrency(enquiry.budget_max)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Search + sort + filter toggle ── */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, category, bio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-48">
            <ArrowUpDown className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters((v) => !v)}
          className="flex-shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white text-indigo-700 text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
            <X className="w-3.5 h-3.5 mr-1" />Clear all
          </Button>
        )}
      </div>

      {/* ── Filter panel ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border bg-card p-5 space-y-5">

              {/* Categories — multi-select chips */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Category</p>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleCategory(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        categories.includes(c)
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-background border-border text-muted-foreground hover:border-indigo-400 hover:text-indigo-600"
                      }`}
                    >
                      {categories.includes(c) && <Check className="w-3 h-3 inline mr-1" />}
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cities — multi-select chips */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">City / Location</p>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                  {allCities.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleCity(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex-shrink-0 ${
                        cities.includes(c)
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-background border-border text-muted-foreground hover:border-violet-400"
                      }`}
                    >
                      {cities.includes(c) && <Check className="w-3 h-3 inline mr-1" />}
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price range + Rating + Verified — in a row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Min price */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Min Price (₹)</p>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="0"
                      className="pl-8"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Max price */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Max Price (₹)</p>
                    {enquiry && (
                      <button
                        onClick={() => setMaxPrice(enquiry.budget_max)}
                        className="text-[10px] text-indigo-600 hover:underline"
                      >
                        Use client budget
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="No limit"
                      className="pl-8"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Min rating */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Min Rating</p>
                  <div className="flex gap-1.5">
                    {[0, 3, 3.5, 4, 4.5].map((r) => (
                      <button
                        key={r}
                        onClick={() => setMinRating(r)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          minRating === r
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-background border-border text-muted-foreground hover:border-amber-400"
                        }`}
                      >
                        {r === 0 ? "Any" : `${r}+`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Verified only toggle */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setVerifiedOnly((v) => !v)}
                  className={`w-10 h-6 rounded-full transition-all relative flex-shrink-0 ${
                    verifiedOnly ? "bg-emerald-500" : "bg-muted"
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    verifiedOnly ? "left-5" : "left-1"
                  }`} />
                </button>
                <div>
                  <p className="text-sm font-medium">Verified artists only</p>
                  <p className="text-xs text-muted-foreground">Show only background-verified performers</p>
                </div>
              </div>

              {/* Active filters summary */}
              {(categories.length > 0 || cities.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {categories.map((c) => (
                    <span key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                      {c}
                      <button onClick={() => toggleCategory(c)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  {cities.map((c) => (
                    <span key={c} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                      <MapPin className="w-3 h-3" />{c}
                      <button onClick={() => toggleCity(c)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results summary ── */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {artists.length} verified artists
          {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount !== 1 ? "s" : ""} active`}
        </span>
      </div>

      {/* ── Shortlist sticky bar ── */}
      <AnimatePresence>
        {shortlisted.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
          >
            <div className="rounded-2xl bg-navy-900 text-white shadow-2xl shadow-navy-900/50 p-4 flex items-center gap-4">
              {/* Shortlisted avatars */}
              <div className="flex -space-x-2 flex-shrink-0">
                {shortlistedArtists.slice(0, 5).map((a) => (
                  <div key={a.id} className="w-9 h-9 rounded-full border-2 border-navy-900 overflow-hidden flex-shrink-0 flex items-center justify-center gold-gradient">
                    {a.user?.avatar_url ? (
                      <img src={a.user.avatar_url} alt={a.user?.name ?? ""} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-navy-900 text-xs font-bold">{getInitials(a.user?.name ?? "A")}</span>
                    )}
                  </div>
                ))}
                {shortlisted.size > 5 && (
                  <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-navy-900 flex items-center justify-center text-white text-xs font-bold">
                    +{shortlisted.size - 5}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  {shortlisted.size} artist{shortlisted.size !== 1 ? "s" : ""} shortlisted
                </p>
                <p className="text-white/60 text-xs truncate">
                  {shortlistedArtists.map((a) => a.user?.name).join(", ")}
                </p>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setShortlisted(new Set())}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  className="bg-gold-500 hover:bg-gold-400 text-navy-900 font-semibold"
                  onClick={goToCreateProposal}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />Create Proposal
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Artist grid ── */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border-2 border-dashed border-muted">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium mb-1">No artists match your filters</p>
          <p className="text-sm text-muted-foreground mb-4">Try adjusting or clearing some filters</p>
          <Button variant="outline" onClick={clearAllFilters}>Clear All Filters</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-28">
          {filtered.map((artist, i) => {
            const isShortlisted = shortlisted.has(artist.id);
            const photo = primaryPhoto(artist);
            const withinBudget = enquiry && artist.base_price <= enquiry.budget_max;
            const overBudget   = enquiry && artist.base_price > enquiry.budget_max;

            return (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
              >
                <div className={`rounded-2xl border overflow-hidden hover:shadow-lg transition-all ${
                  isShortlisted ? "ring-2 ring-indigo-500 ring-offset-1" : ""
                } ${overBudget ? "border-red-200" : ""}`}>

                  {/* Budget indicator bar */}
                  {enquiry && (
                    <div className={`h-1 ${withinBudget ? "bg-emerald-400" : "bg-red-400"}`} />
                  )}

                  {/* Photo / avatar */}
                  <div className="relative h-44 bg-gradient-to-br from-navy-900 to-navy-700 flex items-center justify-center">
                    {photo ? (
                      <img src={photo} alt={artist.user?.name} className="w-full h-full object-cover" />
                    ) : artist.user?.avatar_url ? (
                      <img src={artist.user.avatar_url} alt={artist.user?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-full gold-gradient flex items-center justify-center text-navy-900 font-bold text-2xl">
                        {getInitials(artist.user?.name ?? "A")}
                      </div>
                    )}

                    {/* Verified badge */}
                    {artist.is_verified && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 backdrop-blur-sm">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                        <span className="text-[10px] text-white font-semibold">Verified</span>
                      </div>
                    )}

                    {/* Budget fit badge */}
                    {enquiry && (
                      <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm ${
                        withinBudget
                          ? "bg-emerald-500/90 text-white"
                          : "bg-red-500/90 text-white"
                      }`}>
                        {withinBudget ? "Within budget" : "Over budget"}
                      </div>
                    )}

                    {/* Shortlist overlay button */}
                    <button
                      onClick={() => toggleShortlist(artist.id)}
                      className={`absolute bottom-2 right-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md ${
                        isShortlisted
                          ? "bg-indigo-600 text-white"
                          : "bg-black/50 text-white hover:bg-indigo-600 backdrop-blur-sm"
                      }`}
                    >
                      {isShortlisted
                        ? <><Check className="w-3 h-3" />Shortlisted</>
                        : <><Plus className="w-3 h-3" />Shortlist</>}
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display font-semibold text-base truncate">{artist.user?.name}</h3>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-semibold">{artist.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-0.5">{artist.total_bookings} bookings completed</p>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {artist.categories.slice(0, 2).map((c) => (
                        <Badge key={c} variant="secondary" className={`text-[10px] ${categories.includes(c) ? "bg-indigo-100 text-indigo-700" : ""}`}>{c}</Badge>
                      ))}
                      {artist.categories.length > 2 && (
                        <Badge variant="outline" className="text-[10px]">+{artist.categories.length - 2}</Badge>
                      )}
                    </div>

                    {/* Cities */}
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{artist.cities.slice(0, 3).join(", ")}{artist.cities.length > 3 ? ` +${artist.cities.length - 3}` : ""}</span>
                    </div>

                    {/* Price */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className={`flex items-center gap-0.5 font-bold text-base ${
                        overBudget ? "text-red-600" : withinBudget ? "text-emerald-700" : "text-indigo-700"
                      }`}>
                        <IndianRupee className="w-4 h-4" />
                        {formatCurrency(artist.base_price).replace("₹", "")}
                        <span className="text-xs text-muted-foreground font-normal ml-1">onwards</span>
                      </div>
                      {artist.user?.phone && (
                        <a href={`tel:${artist.user.phone}`} className="text-muted-foreground hover:text-foreground">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    {/* Bio snippet */}
                    {artist.bio && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{artist.bio}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => { setProfileArtist(artist); setPhotoIdx(0); }}
                      >
                        <User className="w-3.5 h-3.5 mr-1.5" />View Profile
                      </Button>
                      <Button
                        size="sm"
                        className={`flex-1 text-xs ${
                          isShortlisted
                            ? "bg-indigo-100 text-indigo-700 hover:bg-red-50 hover:text-red-600 border border-indigo-200"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        }`}
                        onClick={() => toggleShortlist(artist.id)}
                      >
                        {isShortlisted
                          ? <><X className="w-3 h-3 mr-1" />Remove</>
                          : <><Plus className="w-3 h-3 mr-1" />Shortlist</>}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════
          ARTIST PROFILE DRAWER
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {profileArtist && (() => {
          const a = profileArtist;
          const photos = a.media.filter((m) => m.type === "photo");
          const isShortlisted = shortlisted.has(a.id);
          const withinBudget = enquiry ? a.base_price <= enquiry.budget_max : null;
          const social = (a as any).social_links ?? {};

          return (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                onClick={() => setProfileArtist(null)}
              />

              {/* Drawer panel */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                className="fixed right-0 top-0 h-full w-full max-w-lg bg-background z-50 shadow-2xl flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                  <button
                    onClick={() => setProfileArtist(null)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />Back to search
                  </button>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={isShortlisted ? "outline" : "default"}
                      className={isShortlisted ? "border-indigo-300 text-indigo-700" : ""}
                      onClick={() => toggleShortlist(a.id)}
                    >
                      {isShortlisted
                        ? <><Check className="w-3.5 h-3.5 mr-1.5" />Shortlisted</>
                        : <><Plus className="w-3.5 h-3.5 mr-1.5" />Shortlist</>}
                    </Button>
                  </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto">

                  {/* Photo gallery */}
                  <div className="relative h-64 bg-gradient-to-br from-navy-900 to-navy-700 flex-shrink-0">
                    {photos.length > 0 ? (
                      <>
                        <img
                          src={photos[photoIdx]?.url}
                          alt={a.user?.name}
                          className="w-full h-full object-cover"
                        />
                        {photos.length > 1 && (
                          <>
                            <button
                              onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                              {photos.map((_, i) => (
                                <button
                                  key={i}
                                  onClick={() => setPhotoIdx(i)}
                                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIdx ? "bg-white scale-125" : "bg-white/40"}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px]">
                          {photoIdx + 1}/{photos.length} photos
                        </div>
                      </>
                    ) : a.user?.avatar_url ? (
                      <img src={a.user.avatar_url} alt={a.user?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full gold-gradient flex items-center justify-center text-navy-900 font-bold text-3xl">
                          {getInitials(a.user?.name ?? "A")}
                        </div>
                      </div>
                    )}

                    {/* Verified overlay */}
                    {a.is_verified && (
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span className="text-xs text-white font-semibold">Verified Artist</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-5">

                    {/* Name + rating + budget fit */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display font-bold text-xl">{a.user?.name}</h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map((s) => (
                              <Star key={s} className={`w-4 h-4 ${s <= Math.round(a.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                            ))}
                            <span className="text-sm font-semibold ml-1">{a.rating.toFixed(1)}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">· {a.total_bookings} bookings</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-display font-bold text-xl ${withinBudget === true ? "text-emerald-700" : withinBudget === false ? "text-red-600" : "text-indigo-700"}`}>
                          {formatCurrency(a.base_price)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">base price</p>
                        {withinBudget !== null && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
                            withinBudget ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                          }`}>
                            {withinBudget ? "Within budget" : "Over budget"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact row */}
                    <div className="flex gap-3 flex-wrap">
                      {a.user?.phone && (
                        <a href={`tel:${a.user.phone}`} className="flex items-center gap-2 px-3 py-2 rounded-xl border hover:bg-accent transition-colors text-sm">
                          <Phone className="w-4 h-4 text-emerald-600" />{a.user.phone}
                        </a>
                      )}
                      {a.user?.email && (
                        <a href={`mailto:${a.user.email}`} className="flex items-center gap-2 px-3 py-2 rounded-xl border hover:bg-accent transition-colors text-sm">
                          <Mail className="w-4 h-4 text-indigo-500" />{a.user.email}
                        </a>
                      )}
                    </div>

                    {/* Categories */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Specialities</p>
                      <div className="flex flex-wrap gap-2">
                        {a.categories.map((c) => (
                          <span key={c} className="px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-medium text-indigo-700">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Cities */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Available Cities</p>
                      <div className="flex flex-wrap gap-2">
                        {a.cities.map((c) => (
                          <span key={c} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${
                            enquiry?.city === c
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-muted/40 text-muted-foreground"
                          }`}>
                            <MapPin className="w-3 h-3" />{c}
                            {enquiry?.city === c && <Check className="w-3 h-3" />}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: Star,     label: "Rating",   value: `${a.rating.toFixed(1)} / 5` },
                        { icon: BookOpen, label: "Bookings", value: String(a.total_bookings) },
                        { icon: Award,    label: "Status",   value: a.is_verified ? "Verified" : "Unverified" },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="text-center p-3 rounded-xl bg-muted/30 border">
                          <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs font-semibold">{value}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Bio */}
                    {a.bio && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">About</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{a.bio}</p>
                      </div>
                    )}

                    {/* Social links */}
                    {Object.keys(social).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Social / Portfolio</p>
                        <div className="flex flex-wrap gap-2">
                          {(Object.entries(social) as [string, unknown][]).map(([platform, url]) =>
                            url ? (
                              <a
                                key={platform}
                                href={String(url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl border text-xs capitalize hover:bg-accent transition-colors"
                              >
                                {platform}
                              </a>
                            ) : null
                          )}
                        </div>
                      </div>
                    )}

                    {/* If within enquiry context, show fit summary */}
                    {enquiry && (
                      <div className={`p-4 rounded-2xl border ${withinBudget ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2 ${withinBudget ? 'text-emerald-700' : 'text-red-700'}">
                          Fit for: {enquiry.event_type} · {enquiry.client?.name}
                        </p>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Client budget</span>
                            <span className="font-semibold">{formatCurrency(enquiry.budget_min)} – {formatCurrency(enquiry.budget_max)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Artist base price</span>
                            <span className={`font-semibold ${withinBudget ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(a.base_price)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">City match</span>
                            <span className={`font-semibold ${a.cities.includes(enquiry.city) ? "text-emerald-700" : "text-amber-600"}`}>
                              {a.cities.includes(enquiry.city) ? `Available in ${enquiry.city}` : `Not listed in ${enquiry.city}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="p-4 border-t flex gap-3 flex-shrink-0">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setProfileArtist(null)}
                  >
                    Close
                  </Button>
                  <Button
                    className={`flex-1 ${isShortlisted ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
                    onClick={() => { toggleShortlist(a.id); if (!isShortlisted) setProfileArtist(null); }}
                  >
                    {isShortlisted
                      ? <><X className="w-4 h-4 mr-2" />Remove from Shortlist</>
                      : <><Plus className="w-4 h-4 mr-2" />Add to Shortlist</>}
                  </Button>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
