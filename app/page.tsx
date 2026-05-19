"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Star, Music, Sparkles, ArrowRight, CheckCircle2,
  Users, Calendar, Globe, Phone, Mail, Search,
  Mic2, Award, Heart, Zap, Shield, Clock,
  Mic, Headphones, Laugh, Music2, Guitar, Wand2,
  Megaphone, PersonStanding,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";

/* ─── Data ────────────────────────────────────────────────── */
const stats = [
  { label: "Events Managed", value: "2,400+", icon: Calendar, color: "from-violet-500 to-purple-600" },
  { label: "Artists Listed",  value: "850+",  icon: Music,    color: "from-pink-500 to-rose-600" },
  { label: "Happy Clients",   value: "1,200+",icon: Heart,    color: "from-amber-500 to-orange-500" },
  { label: "Cities Covered",  value: "50+",   icon: Globe,    color: "from-teal-500 to-cyan-600" },
];

const categories: { name: string; icon: LucideIcon; count: number; color: string; bg: string; iconBg: string }[] = [
  { name: "Bollywood Singers", icon: Mic2,          count: 120, color: "from-rose-400 to-pink-600",    bg: "bg-rose-50",    iconBg: "bg-rose-100 text-rose-600" },
  { name: "DJs",               icon: Headphones,    count: 95,  color: "from-violet-400 to-purple-600",bg: "bg-violet-50", iconBg: "bg-violet-100 text-violet-600" },
  { name: "Comedians",         icon: Laugh,         count: 60,  color: "from-amber-400 to-orange-500", bg: "bg-amber-50",  iconBg: "bg-amber-100 text-amber-600" },
  { name: "Anchors / Emcees",  icon: Mic,           count: 80,  color: "from-teal-400 to-cyan-600",    bg: "bg-teal-50",   iconBg: "bg-teal-100 text-teal-600" },
  { name: "Dance Troupes",     icon: PersonStanding,count: 70,  color: "from-fuchsia-400 to-pink-600", bg: "bg-fuchsia-50",iconBg: "bg-fuchsia-100 text-fuchsia-600" },
  { name: "Bands",             icon: Guitar,        count: 45,  color: "from-blue-400 to-indigo-600",  bg: "bg-blue-50",   iconBg: "bg-blue-100 text-blue-600" },
  { name: "Classical Singers", icon: Music2,        count: 55,  color: "from-emerald-400 to-green-600",bg: "bg-emerald-50",iconBg: "bg-emerald-100 text-emerald-600" },
  { name: "Magicians",         icon: Wand2,         count: 30,  color: "from-yellow-400 to-amber-500", bg: "bg-yellow-50", iconBg: "bg-yellow-100 text-yellow-600" },
];

const eventTypes = ["Wedding", "Corporate", "Birthday", "Concert", "College Fest", "Private Party"];

const howItWorks = [
  { step: "01", title: "Browse & Choose", desc: "Explore 850+ verified artists by category, city, and budget. Read reviews and check availability.", icon: Search, color: "from-violet-500 to-purple-600", shadow: "shadow-violet-200" },
  { step: "02", title: "Raise Enquiry",   desc: "Fill in your event details in 2 minutes. Our coordinator will call you within 2 hours.", icon: Mic2,    color: "from-rose-500 to-pink-600",   shadow: "shadow-rose-200" },
  { step: "03", title: "Get Proposal",    desc: "Receive a curated proposal with handpicked artists, pricing, and availability.", icon: Sparkles, color: "from-amber-500 to-orange-500", shadow: "shadow-amber-200" },
  { step: "04", title: "Book & Relax",    desc: "Confirm your booking, pay advance, and we handle everything till showtime.", icon: CheckCircle2, color: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-200" },
];

const testimonials = [
  { name: "Priya Sharma",  event: "Wedding Reception · Mumbai",    rating: 5, text: "Absolutely phenomenal! They arranged a top Bollywood singer for our wedding in just 3 days. Seamless experience from enquiry to performance.", avatar: "PS", color: "from-rose-400 to-pink-500" },
  { name: "Rahul Mehta",   event: "Corporate Gala · Bengaluru",    rating: 5, text: "BookMyEventStar made our annual event unforgettable. The comedian kept 500 employees laughing all evening. Highly professional.", avatar: "RM", color: "from-violet-400 to-purple-500" },
  { name: "Ananya Reddy",  event: "Birthday Party · Hyderabad",    rating: 5, text: "Found the perfect DJ for my 30th in under 24 hours. The coordinator was super responsive and the artist was even better than expected.", avatar: "AR", color: "from-amber-400 to-orange-500" },
];

const features = [
  { icon: Shield,  title: "100% Verified Artists",  desc: "Every artist is background-checked and reviewed",    color: "text-violet-600", bg: "bg-violet-50" },
  { icon: Clock,   title: "2-Hour Response",         desc: "Expert coordinator contacts you within 2 hours",      color: "text-rose-600",   bg: "bg-rose-50" },
  { icon: Zap,     title: "Hassle-free Booking",     desc: "End-to-end management from shortlist to showtime",    color: "text-amber-600",  bg: "bg-amber-50" },
  { icon: Award,   title: "Best Price Guaranteed",   desc: "Direct artist pricing — no hidden commissions",       color: "text-teal-600",   bg: "bg-teal-50" },
];

/* ─── Ticker ──────────────────────────────────────────────── */
const tickerItems: { label: string; icon: LucideIcon }[] = [
  { label: "Bollywood Singers", icon: Mic2 },
  { label: "DJs",               icon: Headphones },
  { label: "Comedians",         icon: Laugh },
  { label: "Dance Troupes",     icon: PersonStanding },
  { label: "Live Bands",        icon: Guitar },
  { label: "Anchors & Emcees",  icon: Mic },
  { label: "Magicians",         icon: Wand2 },
  { label: "Classical Artists", icon: Music2 },
  { label: "Speakers",          icon: Megaphone },
];

function Ticker() {
  const doubled = [...tickerItems, ...tickerItems];
  return (
    <div className="overflow-hidden bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 py-3">
      <motion.div
        animate={{ x: [0, "-50%"] }}
        transition={{ repeat: Infinity, duration: 22, ease: "linear" }}
        className="flex gap-10 whitespace-nowrap"
      >
        {doubled.map((item, i) => {
          const Icon = item.icon;
          return (
            <span key={i} className="text-white font-semibold text-sm tracking-wide flex items-center gap-2">
              <Icon className="w-4 h-4 text-white/80 flex-shrink-0" />
              {item.label}
              <span className="text-white/30 ml-4">·</span>
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ─── Featured Artists (from DB) ──────────────────────────── */
function FeaturedArtists() {
  const [artists, setArtists] = useState<any[]>([]);
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("artist_profiles")
      .select("id, bio, categories, cities, base_price, rating, total_bookings, is_verified, user:users!artist_profiles_user_id_fkey(name, avatar_url)")
      .eq("is_verified", true)
      .eq("is_listed", true)
      .eq("is_profile_complete", true)
      .order("rating", { ascending: false })
      .limit(4)
      .then(({ data }) => { if (data) setArtists(data); });
  }, []);

  if (artists.length === 0) return null;

  const cardColors = [
    "from-rose-400 to-pink-600",
    "from-violet-400 to-purple-600",
    "from-amber-400 to-orange-500",
    "from-teal-400 to-cyan-600",
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-gold-100 text-gold-700 text-xs font-bold uppercase tracking-widest mb-3">
            Featured Artists
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-900">
            Top Verified Performers
          </h2>
          <p className="mt-3 text-muted-foreground">Handpicked by our expert coordinators</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {artists.map((artist, i) => {
            const user = Array.isArray(artist.user) ? artist.user[0] : artist.user;
            const name = user?.name ?? "Artist";
            const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <Link href="/artists">
                  <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 bg-white group">
                    <div className={`h-36 bg-gradient-to-br ${cardColors[i % cardColors.length]} flex items-center justify-center relative overflow-hidden`}>
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 70% 70%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                      <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40 shadow-lg">
                        <span className="text-2xl font-bold text-white">{initials}</span>
                      </div>
                      {artist.is_verified && (
                        <div className="absolute top-3 right-3 bg-white/90 rounded-full px-2 py-0.5 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-600">Verified</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-navy-900 truncate">{name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {(artist.categories as string[])?.slice(0, 2).join(", ")}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-semibold">{Number(artist.rating).toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({artist.total_bookings})</span>
                        </div>
                        <span className="text-xs font-bold text-gold-600">
                          {formatCurrency(artist.base_price)}+
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {(artist.cities as string[])?.slice(0, 2).map((c: string) => (
                          <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
        <div className="text-center mt-10">
          <Link href="/artists">
            <Button size="lg" variant="outline" className="border-2 border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white transition-all px-10">
              View All Artists
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Main Page ───────────────────────────────────────────── */
export default function LandingPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <BrandLogo href="/" size="md" priority className="shrink-0" />

          <div className="hidden md:flex items-center gap-8">
            {[["Browse Artists", "/artists"], ["How It Works", "#how-it-works"], ["Categories", "#categories"]].map(([label, href]) => (
              <Link key={label} href={href} className="text-sm font-medium text-gray-600 hover:text-violet-600 transition-colors">{label}</Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" size="sm" className="border-gray-200">Login</Button>
            </Link>
            <Link href="/enquiry">
              <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:opacity-90 shadow-md shadow-violet-200">
                Book Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-0 overflow-hidden">
        {/* Multi-color gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-900" />
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-rose-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold-500/10 blur-3xl" />
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 bg-white/10 text-white/90 text-sm mb-6 backdrop-blur-sm">
              <Award className="w-4 h-4 text-gold-400" />
              India&apos;s #1 Artist Booking Platform • 2,400+ Events Managed
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              Book the{" "}
              <span className="bg-gradient-to-r from-gold-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
                Perfect Artist
              </span>
              <br />
              <span className="text-3xl md:text-5xl lg:text-6xl text-white/90">for Your Event in India</span>
            </h1>

            <p className="mt-5 text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
              Singers · DJs · Comedians · Dancers · Anchors — all in one place with expert coordination.
            </p>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="mt-10 max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-2xl shadow-violet-900/40 border border-white/20">
                <Search className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search artists — singer, DJ, comedian..."
                  className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 text-sm outline-none py-2 px-2"
                  onKeyDown={(e) => e.key === "Enter" && (window.location.href = `/artists?q=${searchQuery}`)}
                />
                <Link href={`/artists${searchQuery ? `?q=${searchQuery}` : ""}`}>
                  <button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md whitespace-nowrap">
                    Search Artists
                  </button>
                </Link>
              </div>

              {/* Quick event type pills */}
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {eventTypes.map((t) => (
                  <Link key={t} href={`/enquiry?event_type=${t}`}>
                    <span className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-medium hover:bg-white/20 transition-all border border-white/10 cursor-pointer backdrop-blur-sm">
                      {t}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/artists">
                <Button size="lg" className="w-full sm:w-auto px-8 text-base bg-white text-violet-700 hover:bg-white/90 font-bold shadow-xl">
                  <Users className="w-5 h-5 mr-2" />
                  Browse All Artists
                </Button>
              </Link>
              <Link href="/enquiry">
                <Button size="lg" className="w-full sm:w-auto px-8 text-base bg-gradient-to-r from-gold-500 to-amber-500 text-navy-900 font-bold hover:opacity-90 shadow-xl shadow-gold-500/30 border-0">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Raise Free Enquiry
                </Button>
              </Link>
            </motion.div>

            <p className="mt-4 text-white/50 text-xs flex items-center justify-center gap-4">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Free enquiry</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> No upfront fee</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 2-hour response</span>
            </p>
          </motion.div>

          {/* Stats floating bar */}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 + i * 0.1 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 text-center"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} mx-auto mb-2 flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-display text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/60 mt-0.5">{stat.label}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Ticker ── */}
      <Ticker />

      {/* ── Features Strip ── */}
      <section className="py-12 bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-navy-900">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section id="categories" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-fuchsia-50 text-fuchsia-700 text-xs font-bold uppercase tracking-widest mb-3">
              For Every Occasion
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-900">
              Browse by Category
            </h2>
            <p className="mt-3 text-muted-foreground">Click any category to instantly see available artists</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map((cat, i) => {
              const Icon = cat.icon;
              return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ scale: 1.04, y: -4 }}
              >
                <Link href={`/artists?category=${encodeURIComponent(cat.name)}`}>
                  <div className={`relative overflow-hidden rounded-2xl p-5 cursor-pointer border-2 border-transparent transition-all duration-300 group ${cat.bg}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative z-10 text-center">
                      <div className={`w-14 h-14 rounded-2xl ${cat.iconBg} group-hover:bg-white/20 flex items-center justify-center mx-auto mb-3 transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:scale-110`}>
                        <Icon className="w-7 h-7 group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h3 className="font-bold text-sm text-navy-900 group-hover:text-white transition-colors">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground group-hover:text-white/80 transition-colors mt-1">{cat.count}+ artists</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link href="/artists">
              <Button variant="outline" size="lg" className="border-2 border-violet-200 text-violet-700 hover:bg-violet-50 px-10">
                See All Categories <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured Artists from DB ── */}
      <FeaturedArtists />

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold uppercase tracking-widest mb-3">
              Simple Process
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-900">
              How BookMyEventStar Works
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">From enquiry to event day — we handle everything with expert precision</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {howItWorks.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                  className="relative"
                >
                  {i < howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 z-0 -translate-x-6">
                      <div className="w-full h-full border-t-2 border-dashed border-violet-200" />
                    </div>
                  )}
                  <div className="relative z-10 bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 text-center">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} mx-auto mb-4 flex items-center justify-center shadow-lg ${item.shadow}`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <span className={`inline-block text-xs font-black tracking-widest bg-gradient-to-r ${item.color} bg-clip-text text-transparent mb-1`}>
                      STEP {item.step}
                    </span>
                    <h3 className="font-display font-bold text-lg text-navy-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Link href="/enquiry">
              <Button size="lg" className="px-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-xl shadow-violet-200 hover:opacity-90 text-base font-bold">
                <Sparkles className="w-5 h-5 mr-2" />
                Start Your Enquiry — It&apos;s Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-widest mb-3">
              Client Love
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-900">
              What Our Clients Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              >
                <div className="relative h-full bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${t.color}`} />
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-6 italic">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-navy-900">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.event}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Big CTA ── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-fuchsia-900 to-rose-900" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex justify-center mb-6">
              <BrandLogo href="/" size="xl" className="shadow-xl shadow-black/20" />
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white">
              Ready to Make Your Event{" "}
              <span className="bg-gradient-to-r from-gold-300 to-amber-300 bg-clip-text text-transparent">
                Unforgettable?
              </span>
            </h2>
            <p className="mt-5 text-white/70 text-lg max-w-xl mx-auto">
              Join 1,200+ happy clients. Submit a free enquiry and our coordinator will call you in 2 hours.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/artists">
                <Button size="lg" className="px-10 bg-white text-violet-700 font-bold hover:bg-white/90 shadow-xl text-base">
                  <Users className="w-5 h-5 mr-2" />
                  Browse Artists
                </Button>
              </Link>
              <Link href="/enquiry">
                <Button size="lg" className="px-10 bg-gradient-to-r from-gold-500 to-amber-500 text-navy-900 font-bold border-0 hover:opacity-90 shadow-xl shadow-gold-500/30 text-base">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Get Free Quote
                </Button>
              </Link>
              <a href="tel:+919999999999">
                <Button size="lg" className="px-8 bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-sm text-base">
                  <Phone className="w-5 h-5 mr-2" />
                  Call Us
                </Button>
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-white/50 text-sm">
              {["Free enquiry", "No upfront cost", "Expert coordinators", "Pan-India coverage"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />{t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-950 text-white/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-3">
            <BrandLogo href="/" size="lg" frame={false} className="shrink-0" />
            <p className="text-xs text-white/30 text-center md:text-left max-w-xs">
              © 2026 · India&apos;s Premier Artist Booking Platform
            </p>
          </div>
            <div className="flex items-center gap-6 text-sm">
              {[["Browse Artists", "/artists"], ["Raise Enquiry", "/enquiry"], ["Login", "/login"], ["Register", "/register"]].map(([label, href]) => (
                <Link key={label} href={href} className="hover:text-white transition-colors">{label}</Link>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <a href="mailto:hello@bookmyeventstar.com" className="hover:text-white transition-colors"><Mail className="w-5 h-5" /></a>
              <a href="https://wa.me/919999999999" className="hover:text-white transition-colors"><Phone className="w-5 h-5" /></a>
              <a href="https://instagram.com/bookmyeventstar" className="hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
