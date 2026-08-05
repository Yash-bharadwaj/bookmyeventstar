"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Star, Sparkles, ArrowRight, CheckCircle2,
  Users, Globe, Phone, Mail, Search,
  Mic2, Award, Zap, Shield, Clock,
  Mic, Headphones, Laugh, Music2, Guitar, Wand2,
  Megaphone, PersonStanding, Menu, X, Heart, Crown,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { formatCurrency } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";

/* ─── Data ────────────────────────────────────────────────── */
const stats = [
  { label: "Every Artist", value: "Verified", icon: Shield, color: "from-gold-500 to-gold-700" },
  { label: "Coordinator Response", value: "2 Hours", icon: Clock, color: "from-navy-600 to-navy-800" },
  { label: "Coverage", value: "Pan-India", icon: Globe, color: "from-gold-500 to-gold-700" },
  { label: "Upfront Fee", value: "₹0", icon: CheckCircle2, color: "from-navy-600 to-navy-800" },
];

const categories: { name: string; icon: LucideIcon; color: string; bg: string; iconBg: string }[] = [
  { name: "Bollywood Singers", icon: Mic2,          color: "from-gold-400 to-gold-600", bg: "bg-gold-50",  iconBg: "bg-gold-100 text-gold-700" },
  { name: "DJs",               icon: Headphones,    color: "from-navy-600 to-navy-800", bg: "bg-navy-50",  iconBg: "bg-navy-100 text-navy-700" },
  { name: "Comedians",         icon: Laugh,         color: "from-gold-400 to-gold-600", bg: "bg-gold-50",  iconBg: "bg-gold-100 text-gold-700" },
  { name: "Anchors / Emcees",  icon: Mic,           color: "from-navy-600 to-navy-800", bg: "bg-navy-50",  iconBg: "bg-navy-100 text-navy-700" },
  { name: "Dance Troupes",     icon: PersonStanding,color: "from-gold-400 to-gold-600", bg: "bg-gold-50",  iconBg: "bg-gold-100 text-gold-700" },
  { name: "Bands",             icon: Guitar,        color: "from-navy-600 to-navy-800", bg: "bg-navy-50",  iconBg: "bg-navy-100 text-navy-700" },
  { name: "Classical Singers", icon: Music2,        color: "from-gold-400 to-gold-600", bg: "bg-gold-50",  iconBg: "bg-gold-100 text-gold-700" },
  { name: "Magicians",         icon: Wand2,         color: "from-navy-600 to-navy-800", bg: "bg-navy-50",  iconBg: "bg-navy-100 text-navy-700" },
];

const eventTypes = ["Wedding", "Corporate", "Birthday", "Concert", "College Fest", "Private Party"];

const howItWorks = [
  { step: "01", title: "Raise Enquiry",   desc: "Share your event type, city, date, and budget. Takes just 2 minutes.", icon: Search, color: "from-gold-500 to-gold-700", shadow: "shadow-gold-200" },
  { step: "02", title: "We Shortlist",    desc: "Your coordinator hand-picks verified artists that match your brief and calls you within 2 hours.", icon: Mic2, color: "from-navy-600 to-navy-800", shadow: "shadow-navy-200" },
  { step: "03", title: "Get Proposal",    desc: "Receive a curated proposal with handpicked artists, pricing, and availability.", icon: Sparkles, color: "from-gold-500 to-gold-700", shadow: "shadow-gold-200" },
  { step: "04", title: "Book & Relax",    desc: "Confirm your booking, pay advance, and we handle everything till showtime.", icon: CheckCircle2, color: "from-navy-600 to-navy-800", shadow: "shadow-navy-200" },
];

const promises = [
  { title: "Every artist is verified", desc: "No one appears in search until our team has reviewed their profile, portfolio, and documents.", icon: Shield, color: "from-gold-500 to-gold-700" },
  { title: "A coordinator, not a chatbot", desc: "A real person manages your enquiry end-to-end — shortlisting, negotiating, and logistics until showtime.", icon: Users, color: "from-navy-600 to-navy-800" },
  { title: "Pricing you see upfront", desc: "Your proposal shows the artist, the price, and what's included — before you commit to anything.", icon: CheckCircle2, color: "from-gold-500 to-gold-700" },
];

const verifySteps = [
  { title: "Artist applies", desc: "Any performer can apply with their bio, pricing, categories, and portfolio.", icon: Users },
  { title: "Our team reviews", desc: "We check documents and portfolio quality before anyone gets approved.", icon: Shield },
  { title: "Verified & listed", desc: "Approved artists get a Verified badge and become visible to our coordinators for matching against client enquiries.", icon: Award },
];

const artistBenefits = [
  "Get discovered by coordinators actively booking for real events",
  "We handle client coordination, contracts, and logistics — you focus on performing",
  "Free to list — no cost to create or maintain your profile",
  "Manage your availability, bookings, and earnings from one dashboard",
];

const faqs = [
  { q: "Is it free to submit an enquiry?", a: "Yes. Submitting an enquiry costs nothing, and there's no obligation to book anything afterward." },
  { q: "How quickly will I hear back?", a: "A dedicated coordinator responds to every enquiry within 2 hours." },
  { q: "How is pricing decided?", a: "Your coordinator sends a proposal with the artist and price clearly listed, so you see everything before you commit." },
  { q: "How are artists verified?", a: "Every artist's profile, pricing, and documents are reviewed by our team before a coordinator can match them to your enquiry." },
  { q: "Can I change my event details after booking?", a: "Yes — your coordinator manages any changes directly with you and the artist." },
  { q: "I'm an artist — how do I get paid?", a: "Coordinators manage settlement directly with you after the event, based on the platform's booking terms." },
];

const features = [
  { icon: Shield,  title: "100% Verified Artists",  desc: "Every artist is background-checked and reviewed",    color: "text-gold-600", bg: "bg-gold-50" },
  { icon: Clock,   title: "2-Hour Response",         desc: "Expert coordinator contacts you within 2 hours",      color: "text-navy-700",   bg: "bg-navy-50" },
  { icon: Zap,     title: "Hassle-free Booking",     desc: "End-to-end management from shortlist to showtime",    color: "text-gold-600",  bg: "bg-gold-50" },
  { icon: Award,   title: "Best Price Guaranteed",   desc: "Direct artist pricing — no hidden commissions",       color: "text-navy-700",   bg: "bg-navy-50" },
];

/* ─── Ticker ──────────────────────────────────────────────── */
const tickerItems: { label: string; icon: LucideIcon }[] = [
  { label: "Bollywood Singers", icon: Mic2 },
  { label: "Celebrities",       icon: Crown },
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
    <div className="overflow-hidden navy-gradient py-3">
      <motion.div
        animate={{ x: [0, "-50%"] }}
        transition={{ repeat: Infinity, duration: 22, ease: "linear" }}
        className="flex gap-10 whitespace-nowrap"
      >
        {doubled.map((item, i) => {
          const Icon = item.icon;
          return (
            <span key={i} className="text-white font-semibold text-sm tracking-wide flex items-center gap-2">
              <Icon className="w-4 h-4 text-gold-400 flex-shrink-0" />
              {item.label}
              <span className="text-white/30 ml-4">·</span>
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────── */
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── WhatsApp help button ── */}
      <a
        href="https://wa.me/919963082319"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Need help? Chat with us on WhatsApp"
        title="Need help? Chat with us on WhatsApp"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#25D366] shadow-lg shadow-black/25 flex items-center justify-center transition-transform hover:scale-110"
      >
        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.011 2c-5.522 0-10 4.475-10 9.999a9.964 9.964 0 001.85 5.8L2 22l4.34-1.831a9.99 9.99 0 005.671 1.762c5.522 0 10-4.475 10-9.999S17.533 2 12.011 2zm5.461 12.382c-.297.868-1.837 1.7-2.53 1.775-.69.073-.69.63-4.54-1.037-3.85-1.666-6.352-5.54-6.55-5.812-.203-.273-1.66-2.233-1.66-4.253 0-2.024 1.054-3.22 1.427-3.418.372-.206.862-.31 1.164-.31.303 0 .603.002.87.013.273.015.63-.135.99.735.364.867 1.244 3.042 1.354 3.24.11.19.165.384.055.607-.11.222-.165.356-.331.556-.166.196-.351.44-.5.59-.148.148-.303.309-.13.606.173.298.77 1.271 1.653 2.059 1.135 1.012 2.093 1.325 2.39 1.475.297.148.471.124.644-.075.173-.198.743-.867.94-1.164.199-.298.397-.249.67-.15.272.1 1.733.818 2.03.967.297.15.495.223.567.35.075.124.075.72-.223 1.586z" />
        </svg>
      </a>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <BrandLogo href="/" size="md" priority className="shrink-0" />

          <div className="hidden md:flex items-center gap-8">
            {[["How It Works", "#how-it-works"], ["Categories", "#categories"]].map(([label, href]) => (
              <Link key={label} href={href} className="text-sm font-medium text-gray-600 hover:text-gold-600 transition-colors">{label}</Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop actions — three distinct paths: returning user, artist onboarding, new customer */}
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm" className="border-gray-200">Login</Button>
              </Link>
              <Link href="/register?role=artist">
                <Button variant="secondary" size="sm">
                  Join as Artist
                </Button>
              </Link>
              <Link href="/enquiry">
                <Button size="sm" className="hover:opacity-90 shadow-md shadow-gold-500/30">
                  Book Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Mobile: artist onboarding is the always-reachable CTA now that
                booking is paused — Book Now still lives in the menu below. */}
            <Link href="/register?role=artist" className="md:hidden">
              <Button size="sm" variant="secondary">Join as Artist</Button>
            </Link>
            <button
              type="button"
              className="md:hidden w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-gray-100 bg-white"
            >
              <div className="px-4 sm:px-6 py-4 flex flex-col gap-1">
                {[["How It Works", "#how-it-works"], ["Categories", "#categories"]].map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {label}
                  </Link>
                ))}
                <div className="h-px bg-gray-100 my-2" />
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full border-gray-200">Login</Button>
                  </Link>
                  <Link href="/enquiry" onClick={() => setMobileMenuOpen(false)}>
                    <Button size="sm" className="w-full shadow-md shadow-gold-500/30">Book Now</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-0 overflow-hidden bg-white">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gold-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gold-300/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-navy-100/40 blur-3xl" />
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, #1e2a4a 1px, transparent 1px)", backgroundSize: "30px 30px" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              {["Verified Artists", "Expert Coordination", "Pan-India"].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-navy-100 bg-white text-navy-700 text-xs sm:text-sm shadow-sm whitespace-nowrap"
                >
                  <Award className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" />
                  {t}
                </span>
              ))}
            </div>

            <h1 className="font-display text-[2.25rem] leading-[1.15] sm:text-4xl md:text-6xl lg:text-7xl font-bold text-navy-900 sm:leading-tight">
              <span className="block text-balance">
                Book the{" "}
                <span className="whitespace-nowrap bg-gradient-to-r from-gold-500 via-gold-600 to-gold-500 bg-clip-text text-transparent">
                  Perfect Artist
                </span>
              </span>
              <span className="block mt-1 sm:mt-2 text-2xl sm:text-3xl md:text-5xl lg:text-6xl text-navy-700 text-balance">
                for Your Event in India
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-pretty">
              Singers, DJs, comedians, dancers, anchors — all in one place with expert coordination.
            </p>

            {/* Quick event type pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="mt-10 max-w-2xl mx-auto"
            >
              <div className="flex flex-wrap gap-2 justify-center">
                {eventTypes.map((t) => (
                  <Link key={t} href={`/enquiry?event_type=${t}`}>
                    <span className="px-3 py-1.5 rounded-full bg-navy-50 text-navy-700 text-xs font-medium hover:bg-navy-100 transition-all border border-navy-100 cursor-pointer">
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
              <Link href="/enquiry">
                <Button size="lg" className="w-full sm:w-auto px-8 text-base font-bold hover:opacity-90 shadow-xl shadow-gold-500/30 border-0">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Raise Free Enquiry
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8 text-base font-bold shadow-xl">
                  How It Works
                </Button>
              </a>
            </motion.div>

            <p className="mt-4 text-muted-foreground text-xs flex items-center justify-center gap-4">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Free enquiry</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> No upfront fee</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 2-hour response</span>
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
                  className="bg-white rounded-2xl p-4 border border-navy-100 shadow-sm text-center"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} mx-auto mb-2 flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-display text-2xl font-bold text-navy-900">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
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
            <span className="inline-block px-4 py-1.5 rounded-full bg-navy-100 text-navy-700 text-xs font-bold uppercase tracking-widest mb-3">
              For Every Occasion
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-900 text-balance">
              Browse by Category
            </h2>
            <p className="mt-3 text-muted-foreground">Click any category to start your enquiry</p>
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
                <Link href="/enquiry">
                  <div className={`relative overflow-hidden rounded-2xl p-5 cursor-pointer border-2 border-transparent transition-all duration-300 group ${cat.bg}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative z-10 text-center">
                      <div className={`w-14 h-14 rounded-2xl ${cat.iconBg} group-hover:bg-white/20 flex items-center justify-center mx-auto mb-3 transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:scale-110`}>
                        <Icon className="w-7 h-7 group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h3 className="font-bold text-sm text-navy-900 group-hover:text-white transition-colors">{cat.name}</h3>
                    </div>
                  </div>
                </Link>
              </motion.div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link href="/enquiry">
              <Button variant="outline" size="lg" className="border-2 border-gold-300 text-gold-700 hover:bg-gold-50 px-10">
                Raise an Enquiry <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-navy-50 via-white to-gold-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-navy-100 text-navy-700 text-xs font-bold uppercase tracking-widest mb-3">
              Simple Process
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-900 text-balance">
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
                      <div className="w-full h-full border-t-2 border-dashed border-gold-200" />
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
              <Button size="lg" className="px-12 shadow-xl shadow-gold-500/30 hover:opacity-90 text-base font-bold">
                <Sparkles className="w-5 h-5 mr-2" />
                Start Your Enquiry — It&apos;s Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why book with us ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-gold-50 text-gold-700 text-xs font-bold uppercase tracking-widest mb-3">
              Our Promise
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-900 text-balance">
              Why Book With BookMyEventStar
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {promises.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                >
                  <div className="relative h-full bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${p.color}`} />
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center shadow-md mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="font-bold text-navy-900 mb-1.5">{p.title}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How artists get verified ── */}
      <section className="py-20 bg-gray-50 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-navy-100 text-navy-700 text-xs font-bold uppercase tracking-widest mb-3">
              Trust &amp; Safety
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-900 text-balance">
              How We Verify Every Artist
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Nobody appears in search until they've been through this</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {verifySteps.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                  className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center"
                >
                  <div className="w-14 h-14 rounded-2xl gold-gradient mx-auto mb-4 flex items-center justify-center shadow-lg">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="font-display font-bold text-lg text-navy-900 mb-1.5">{s.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-gold-50 text-gold-700 text-xs font-bold uppercase tracking-widest mb-3">
              Questions
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-navy-900 text-balance">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="bg-gray-50 rounded-2xl border border-gray-100 px-6">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-navy-900">{f.q}</AccordionTrigger>
                <AccordionContent>{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── For Artists ── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 navy-gradient" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-bold uppercase tracking-widest mb-4">
                For Performers
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white leading-tight text-balance">
                Are You a Performer?
              </h2>
              <p className="mt-4 text-white/70">
                Singers, DJs, comedians, dancers, anchors, bands — list your profile and let our coordinators bring the bookings to you.
              </p>
              <Link href="/register?role=artist">
                <Button size="lg" className="mt-6 font-bold shadow-xl shadow-gold-500/30 hover:opacity-90">
                  <Mic2 className="w-5 h-5 mr-2" />
                  Create Your Artist Profile
                </Button>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="space-y-3"
            >
              {artistBenefits.map((b) => (
                <div key={b} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                  <CheckCircle2 className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-white/90">{b}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Big CTA ── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 navy-gradient" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-gold-300/10 blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex justify-center mb-6">
              <BrandLogo href="/" size="xl" className="shadow-xl shadow-black/20" />
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white text-balance">
              Ready to Make Your Event{" "}
              <span className="bg-gradient-to-r from-gold-300 to-gold-400 bg-clip-text text-transparent">
                Unforgettable?
              </span>
            </h2>
            <p className="mt-5 text-white/70 text-lg max-w-xl mx-auto">
              Submit a free enquiry and a dedicated coordinator will call you within 2 hours.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center">
              <Link href="/enquiry" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto px-10 font-bold border-0 hover:opacity-90 shadow-xl shadow-gold-500/30 text-base">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Get Free Quote
                </Button>
              </Link>
              <a href="tel:+919999999999" className="w-full sm:w-auto">
                <Button size="lg" variant="glass" className="w-full sm:w-auto px-8 text-base">
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
            <a href="mailto:enquiry@bookmyeventstar.com" className="text-xs text-white/40 hover:text-white transition-colors">
              enquiry@bookmyeventstar.com
            </a>
          </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              {[["Raise Enquiry", "/enquiry"], ["Login", "/login"], ["Register", "/register"]].map(([label, href]) => (
                <Link key={label} href={href} className="whitespace-nowrap hover:text-white transition-colors">{label}</Link>
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
          <a
            href="https://wa.me/919963082319"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Built and designed with <Heart className="w-3.5 h-3.5 text-gold-400 fill-gold-400" /> by Yashwanth Bharadwaj
          </a>
        </div>
      </footer>
    </div>
  );
}
