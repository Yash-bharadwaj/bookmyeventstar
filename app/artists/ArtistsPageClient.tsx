"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Search, Star, MapPin, CheckCircle2,
  X, Phone, Mail, User, Calendar,
  Mic2, Shield, TrendingUp, ChevronRight, Send,
  ArrowRight, Play, ChevronLeft, Images, Video,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArtistProfile } from "@/types";
import { formatCurrency, getInitials, INDIA_CITIES, EVENT_TYPES } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { z } from "zod";

/* ── Types ───────────────────────────────────────────── */
type Artist = ArtistProfile & {
  user: { name: string; avatar_url?: string };
  media: { url: string; is_primary: boolean; type: string }[];
};

interface Props {
  artists: Artist[];
  initialCategory?: string;
  initialCity?: string;
  categories: string[];
}

/* ── Quick Enquiry Schema ────────────────────────────── */
const quickSchema = z.object({
  name:       z.string().min(2, "Enter your name"),
  phone:      z.string().regex(/^[6-9]\d{9}$/, "Valid 10-digit mobile number"),
  email:      z.string().email("Valid email required"),
  event_type: z.string().min(1, "Select event type"),
  event_date: z.string().min(1, "Select event date"),
  city:       z.string().min(1, "Select city"),
  message:    z.string().optional(),
});
type QuickForm = z.infer<typeof quickSchema>;

/* ── Category accent colors ─────────────────────────── */
const catColor: Record<string, string> = {
  "Bollywood Singer": "from-rose-500 to-pink-600",
  "DJ":               "from-violet-500 to-purple-700",
  "Classical Singer": "from-amber-500 to-orange-500",
  "Ghazal Singer":    "from-teal-500 to-cyan-600",
  "Sufi Singer":      "from-indigo-500 to-blue-600",
  "Folk Artist":      "from-emerald-500 to-green-600",
  "Instrumentalist":  "from-yellow-500 to-amber-500",
  "Band":             "from-blue-500 to-indigo-600",
  "Comedian":         "from-fuchsia-500 to-pink-600",
  "Anchor / Emcee":   "from-cyan-500 to-teal-500",
  "Dance Troupe":     "from-pink-500 to-rose-600",
  "Magician":         "from-purple-500 to-violet-600",
};
const getColor = (cats: string[]) => catColor[cats?.[0]] ?? "from-navy-800 to-navy-900";

/* ── Artist Drawer ───────────────────────────────────── */
function ArtistDrawer({ artist, onClose }: { artist: Artist; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const color = getColor(artist.categories);

  // Build ordered media list: avatar first, then portfolio sorted primary-first
  const allMedia = [
    ...(artist.user.avatar_url ? [{ url: artist.user.avatar_url, type: "image" as const, is_primary: true }] : []),
    ...([...artist.media]
      .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
      .filter((m) => m.url !== artist.user.avatar_url)),
  ];
  const activeMedia = allMedia[activeMediaIdx];
  const hasMedia = allMedia.length > 0;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<QuickForm>({
    resolver: zodResolver(quickSchema),
  });

  const onSubmit = async (data: QuickForm) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("enquiries").insert({
        event_type:         data.event_type,
        event_date:         data.event_date,
        location:           data.city,
        city:               data.city,
        budget_min:         50000,
        budget_max:         500000,
        artist_preference:  artist.user.name,
        other_requirements: data.message || null,
        status:             "new",
        source:             "website",
      });
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: "00000001-0000-0000-0000-000000000001",
        title:   "New Enquiry Received",
        message: `${data.name} wants to book ${artist.user.name} for ${data.event_type} in ${data.city}.`,
        type:    "info",
      });

      setSubmitted(true);
      toast.success("Enquiry submitted! We'll call you within 2 hours.", { duration: 5000 });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />

      {/* Drawer panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-[620px] bg-white shadow-2xl flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Hero Media Block ── */}
        <div className="relative flex-shrink-0" style={{ height: "320px" }}>
          {/* Main media display */}
          {!hasMedia ? (
            <div className={`absolute inset-0 bg-gradient-to-br ${color} flex items-center justify-center`}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <span className="font-bold text-7xl text-white/30 relative z-10">{getInitials(artist.user.name)}</span>
            </div>
          ) : activeMedia?.type === "video" ? (
            <video
              key={activeMedia.url}
              src={activeMedia.url}
              className="absolute inset-0 w-full h-full object-cover bg-black"
              controls
              playsInline
            />
          ) : (
            <img
              key={activeMedia?.url}
              src={activeMedia?.url}
              alt={artist.user.name}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          )}

          {/* Gradient overlay at bottom for text readability */}
          <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors backdrop-blur-sm z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Verified badge */}
          {artist.is_verified && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold border border-white/30 z-10">
              <Shield className="w-3.5 h-3.5" />
              Verified Artist
            </div>
          )}

          {/* Name + price overlay */}
          <div className="absolute bottom-0 inset-x-0 px-5 pb-4 z-10">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-white drop-shadow-lg leading-tight">
                  {artist.user.name}
                </h2>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {artist.categories.map((c) => (
                    <span key={c} className="text-[11px] font-semibold text-white/90 bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/25">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right flex-shrink-0 bg-black/30 backdrop-blur-sm rounded-xl px-3 py-2">
                <p className="text-[10px] text-white/70 font-medium">Starting from</p>
                <p className="text-lg font-bold text-amber-400">{formatCurrency(artist.base_price)}</p>
              </div>
            </div>
          </div>

          {/* Media thumbnails strip — shown if >1 media item */}
          {allMedia.length > 1 && (
            <div className="absolute bottom-16 right-4 flex gap-1.5 z-10">
              {allMedia.slice(0, 6).map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveMediaIdx(idx)}
                  className={`relative w-10 h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                    activeMediaIdx === idx ? "border-white scale-110 shadow-lg" : "border-white/40 opacity-70 hover:opacity-100"
                  }`}
                >
                  {m.type === "video" ? (
                    <div className="absolute inset-0 bg-black flex items-center justify-center">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  ) : (
                    <img src={m.url} alt="" className="w-full h-full object-cover object-top" />
                  )}
                </button>
              ))}
              {allMedia.length > 6 && (
                <div className="w-10 h-10 rounded-lg bg-black/50 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  +{allMedia.length - 6}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Stats row ── */}
        <div className="px-6 py-4 border-b flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-navy-900 leading-none">{Number(artist.rating).toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">Rating</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-navy-900 leading-none">{artist.total_bookings}</p>
              <p className="text-[10px] text-muted-foreground">Bookings</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-navy-900 leading-none">{artist.cities.length}</p>
              <p className="text-[10px] text-muted-foreground">Cities</p>
            </div>
          </div>
          {allMedia.length > 1 && (
            <div className="flex items-center gap-1.5 ml-auto">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Images className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-navy-900 leading-none">{allMedia.length}</p>
                <p className="text-[10px] text-muted-foreground">Portfolio</p>
              </div>
            </div>
          )}
        </div>

        {/* ── About ── */}
        {artist.bio && (
          <div className="px-6 py-4 border-b">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">About</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{artist.bio}</p>
          </div>
        )}

        {/* ── Portfolio grid (images + videos, exclude avatar shown in hero) ── */}
        {artist.media.length > 0 && (
          <div className="px-6 py-4 border-b">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Portfolio · {artist.media.length} item{artist.media.length !== 1 ? "s" : ""}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {artist.media.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const heroIdx = allMedia.findIndex((am) => am.url === m.url);
                    if (heroIdx !== -1) setActiveMediaIdx(heroIdx);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    allMedia[activeMediaIdx]?.url === m.url
                      ? "border-violet-500 ring-2 ring-violet-200"
                      : "border-transparent hover:border-violet-300"
                  }`}
                >
                  {m.type === "video" ? (
                    <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      </div>
                      <span className="text-[9px] text-white/70 font-medium uppercase tracking-wide">Video</span>
                    </div>
                  ) : (
                    <img src={m.url} alt="Portfolio" className="w-full h-full object-cover object-top" />
                  )}
                  {m.type === "video" && (
                    <div className="absolute top-1.5 left-1.5">
                      <Video className="w-3.5 h-3.5 text-white drop-shadow" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Tap any photo or video to preview above</p>
          </div>
        )}

        {/* ── Available Cities ── */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Available In</h3>
          <div className="flex flex-wrap gap-1.5">
            {artist.cities.map((c) => (
              <span key={c} className="flex items-center gap-1 text-xs bg-gray-50 border rounded-full px-2.5 py-1 text-gray-700">
                <MapPin className="w-3 h-3 text-rose-400" />{c}
              </span>
            ))}
          </div>
        </div>

        {/* ── Quick Enquiry Form ── */}
        <div className="px-6 py-6 flex-1 bg-gray-50/50">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="font-display text-xl font-bold text-navy-900">Enquiry Sent!</h3>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                Our coordinator will call you within <strong>2 hours</strong> to discuss booking <strong>{artist.user.name}</strong>.
              </p>
              <Button onClick={onClose} className="mt-6 w-full" size="lg">
                Browse More Artists <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Form header */}
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-200">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md flex-shrink-0`}>
                  <Mic2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-900 text-base">Book {artist.user.name}</h3>
                  <p className="text-xs text-muted-foreground">Free enquiry · Our team calls within 2 hours</p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">Your Name <span className="text-rose-500">*</span></Label>
                    <Input
                      placeholder="Rahul Sharma"
                      icon={<User className="w-4 h-4" />}
                      error={errors.name?.message}
                      {...register("name")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">Mobile Number <span className="text-rose-500">*</span></Label>
                    <Input
                      placeholder="9999999999"
                      icon={<Phone className="w-4 h-4" />}
                      error={errors.phone?.message}
                      {...register("phone")}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Email Address <span className="text-rose-500">*</span></Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    icon={<Mail className="w-4 h-4" />}
                    error={errors.email?.message}
                    {...register("email")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">Event Type <span className="text-rose-500">*</span></Label>
                    <Select onValueChange={(v) => setValue("event_type", v)}>
                      <SelectTrigger className={errors.event_type ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.event_type && <p className="text-[10px] text-destructive">{errors.event_type.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">Event Date <span className="text-rose-500">*</span></Label>
                    <Input
                      type="date"
                      icon={<Calendar className="w-4 h-4" />}
                      min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                      error={errors.event_date?.message}
                      {...register("event_date")}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Event City <span className="text-rose-500">*</span></Label>
                  <Select onValueChange={(v) => setValue("city", v)}>
                    <SelectTrigger className={errors.city ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select city..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIA_CITIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.city && <p className="text-[10px] text-destructive">{errors.city.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Special Requirements (optional)</Label>
                  <Textarea
                    placeholder="Any specific songs, performance duration, stage requirements..."
                    className="min-h-[70px] text-sm"
                    {...register("message")}
                  />
                </div>

                {/* Trust pill */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-50 border border-violet-100">
                  <CheckCircle2 className="w-4 h-4 text-violet-600 flex-shrink-0" />
                  <p className="text-xs text-violet-700">
                    <span className="font-semibold">{artist.user.name}</span> will be added to your enquiry automatically
                  </p>
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  size="lg"
                  className={`w-full bg-gradient-to-r ${color} text-white border-0 shadow-lg hover:opacity-90 font-bold text-base`}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Enquiry — It&apos;s Free
                </Button>

                <p className="text-center text-xs text-muted-foreground pb-2">
                  No payment required now · Our team calls within 2 hours
                </p>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Component ──────────────────────────────────── */
export function ArtistsPageClient({ artists, initialCategory, initialCity, categories }: Props) {
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState(initialCategory ?? "all");
  const [city, setCity]         = useState(initialCity ?? "all");
  const [sortBy, setSortBy]     = useState("rating");
  const [selected, setSelected] = useState<Artist | null>(null);

  const filtered = artists
    .filter((a) => {
      const q = search.toLowerCase();
      const matchSearch = a.user.name.toLowerCase().includes(q) ||
        a.categories.some((c) => c.toLowerCase().includes(q));
      const matchCategory = category === "all" || a.categories.includes(category);
      const matchCity = city === "all" || a.cities.includes(city);
      return matchSearch && matchCategory && matchCity;
    })
    .sort((a, b) => {
      if (sortBy === "rating")      return b.rating - a.rating;
      if (sortBy === "price_asc")   return a.base_price - b.base_price;
      if (sortBy === "price_desc")  return b.base_price - a.base_price;
      if (sortBy === "bookings")    return b.total_bookings - a.total_bookings;
      return 0;
    });

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">

        {/* ── Hero strip ── */}
        <div className="pt-10 pb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-navy-900">
            Find Your Perfect Artist
          </h1>
          <p className="text-muted-foreground mt-1.5">
            {filtered.length} verified artists · Click any card to view profile & book instantly
          </p>
        </div>

        {/* ── Filters ── */}
        <div className="mb-8 space-y-3">
          {/* Row 1: Search + City + Sort — always visible */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search by name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {INDIA_CITIES.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="bookings">Most Booked</SelectItem>
                <SelectItem value="price_asc">Price: Low → High</SelectItem>
                <SelectItem value="price_desc">Price: High → Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Category chips — scrollable, all categories */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {["all", ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border flex-shrink-0 ${
                  category === c
                    ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200"
                    : "bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-600"
                }`}
              >
                {c === "all" ? "All Artists" : c}
              </button>
            ))}
          </div>

          {/* Result count + clear */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> verified artist{filtered.length !== 1 ? "s" : ""}
            </p>
            {(category !== "all" || city !== "all" || search) && (
              <button
                onClick={() => { setSearch(""); setCategory("all"); setCity("all"); }}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* ── Artist Grid ── */}
        {filtered.length === 0 ? (
          <div className="py-32 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-navy-900">No artists found</p>
            <p className="text-muted-foreground text-sm mt-1">Try a different search or clear your filters</p>
            <Button variant="outline" className="mt-5" onClick={() => { setSearch(""); setCategory("all"); setCity("all"); }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((artist, i) => {
              const color = getColor(artist.categories);
              return (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.6) }}
                  whileHover={{ y: -4 }}
                  className="cursor-pointer group"
                  onClick={() => setSelected(artist)}
                >
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                    {/* Card top banner */}
                    <div className={`relative h-44 ${artist.user.avatar_url ? "bg-gray-900" : `bg-gradient-to-br ${color}`}`}>
                      {artist.user.avatar_url ? (
                        <img src={artist.user.avatar_url} alt={artist.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-bold text-4xl text-white/50">{getInitials(artist.user.name)}</span>
                          </div>
                        </>
                      )}
                      {/* Bottom gradient for readability */}
                      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
                      {artist.is_verified && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full border border-white/30">
                          <Shield className="w-2.5 h-2.5" /> Verified
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div className="pt-3 px-4 pb-4">
                      <h3 className="font-display font-bold text-navy-900 truncate">{artist.user.name}</h3>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {artist.categories.slice(0, 2).join(" · ")}
                      </p>

                      {/* Rating + bookings */}
                      <div className="flex items-center gap-3 mt-2.5">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-bold">{Number(artist.rating).toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{artist.total_bookings} shows</span>
                        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />{artist.cities[0]}
                        </span>
                      </div>

                      {/* Price + CTA */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Starting from</p>
                          <p className="text-sm font-bold text-gold-600">{formatCurrency(artist.base_price)}</p>
                        </div>
                        <button
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r ${color} text-white text-xs font-bold shadow-md hover:opacity-90 transition-all group-hover:scale-105`}
                        >
                          Book Now <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Artist Drawer ── */}
      <AnimatePresence>
        {selected && (
          <ArtistDrawer artist={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
