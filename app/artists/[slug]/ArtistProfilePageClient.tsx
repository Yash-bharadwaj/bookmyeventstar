"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Star, MapPin, CheckCircle2, Calendar, Mic2, Shield, TrendingUp,
  Play, Images, Video, Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { FramedPhoto } from "@/components/ui/framed-photo";
import { ArtistProfile } from "@/types";
import { formatCurrency, getInitials, EVENT_TYPES } from "@/lib/utils";
import { useQuickEnquiry } from "@/hooks/useQuickEnquiry";

type City = { name: string; state: string };

type Artist = ArtistProfile & {
  user: { name: string; avatar_url?: string };
  media: { url: string; is_primary: boolean; type: string }[];
};

const catColor: Record<string, string> = {
  "Bollywood Singer": "from-gold-400 to-amber-600",
  "DJ": "from-navy-500 to-navy-700",
  "Classical Singer": "from-navy-600 to-navy-800",
  "Ghazal Singer": "from-gold-400 to-amber-600",
  "Sufi Singer": "from-gold-500 to-gold-700",
  "Folk Artist": "from-navy-600 to-navy-800",
  "Instrumentalist": "from-gold-400 to-amber-600",
  "Band": "from-navy-500 to-navy-700",
  "Comedian": "from-navy-600 to-navy-800",
  "Anchor / Emcee": "from-gold-400 to-amber-600",
  "Dance Troupe": "from-gold-500 to-gold-700",
  "Magician": "from-navy-600 to-navy-800",
};
const getColor = (cats: string[]) => catColor[cats?.[0]] ?? "from-navy-800 to-navy-900";

export function ArtistProfilePageClient({ artist, cities }: { artist: Artist; cities: City[] }) {
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const color = getColor(artist.categories);

  const allMedia = [
    ...(artist.user.avatar_url ? [{ url: artist.user.avatar_url, type: "image" as const, is_primary: true }] : []),
    ...([...artist.media]
      .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
      .filter((m) => m.url !== artist.user.avatar_url)),
  ];
  const activeMedia = allMedia[activeMediaIdx];
  const hasMedia = allMedia.length > 0;

  const { submitted, loading, sessionUser, register, handleSubmit, setValue, errors, onSubmit } = useQuickEnquiry(artist);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
      {/* ── Hero Media Block ── */}
      <div className="relative rounded-3xl overflow-hidden mt-4" style={{ height: "380px" }}>
        {!hasMedia ? (
          <div className={`absolute inset-0 bg-gradient-to-br ${color} flex items-center justify-center`}>
            <span className="font-bold text-8xl text-white/30">{getInitials(artist.user.name)}</span>
          </div>
        ) : activeMedia?.type === "video" ? (
          <video key={activeMedia.url} src={activeMedia.url} className="absolute inset-0 w-full h-full object-cover bg-black" controls playsInline />
        ) : (
          <FramedPhoto key={activeMedia?.url} src={activeMedia?.url ?? ""} alt={artist.user.name} sizes="(max-width: 768px) 100vw, 768px" imgClassName="object-top" priority />
        )}

        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

        {artist.is_verified && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold border border-white/30">
            <Shield className="w-3.5 h-3.5" />
            Verified Artist
          </div>
        )}

        <div className="absolute bottom-0 inset-x-0 px-6 pb-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-bold text-white drop-shadow-lg leading-tight">{artist.user.name}</h1>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {artist.categories.map((c) => (
                  <span key={c} className="text-xs font-semibold text-white/90 bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/25">
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0 bg-black/30 backdrop-blur-sm rounded-xl px-3 py-2">
              <p className="text-[10px] text-white/70 font-medium">Starting from</p>
              <p className="text-xl font-bold text-amber-400">{formatCurrency(artist.base_price)}</p>
            </div>
          </div>
        </div>

        {allMedia.length > 1 && (
          <div className="absolute bottom-24 right-4 flex gap-1.5">
            {allMedia.slice(0, 6).map((m, idx) => (
              <button
                key={idx}
                onClick={() => setActiveMediaIdx(idx)}
                className={`relative w-11 h-11 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                  activeMediaIdx === idx ? "border-white scale-110 shadow-lg" : "border-white/40 opacity-70 hover:opacity-100"
                }`}
              >
                {m.type === "video" ? (
                  <div className="absolute inset-0 bg-black flex items-center justify-center">
                    <Play className="w-3.5 h-3.5 text-white fill-white" />
                  </div>
                ) : (
                  <Image src={m.url} alt="" fill sizes="44px" className="object-cover object-top" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="py-4 border-b flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-navy-900 leading-none">{Number(artist.rating).toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">Rating</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-navy-900 leading-none">{artist.total_bookings}</p>
            <p className="text-[10px] text-muted-foreground">Bookings</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-9 h-9 rounded-lg bg-gold-50 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-gold-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-navy-900 leading-none">{artist.cities.length}</p>
            <p className="text-[10px] text-muted-foreground">Cities</p>
          </div>
        </div>
        {allMedia.length > 1 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-9 h-9 rounded-lg bg-navy-50 flex items-center justify-center">
              <Images className="w-4 h-4 text-navy-600" />
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
        <div className="py-5 border-b">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">About</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{artist.bio}</p>
        </div>
      )}

      {/* ── Portfolio grid ── */}
      {artist.media.length > 0 && (
        <div className="py-5 border-b">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Portfolio · {artist.media.length} item{artist.media.length !== 1 ? "s" : ""}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {artist.media.map((m, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const heroIdx = allMedia.findIndex((am) => am.url === m.url);
                  if (heroIdx !== -1) setActiveMediaIdx(heroIdx);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  allMedia[activeMediaIdx]?.url === m.url ? "border-navy-600 ring-2 ring-navy-200" : "border-transparent hover:border-navy-300"
                }`}
              >
                {m.type === "video" ? (
                  <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                ) : (
                  <FramedPhoto src={m.url} alt="Portfolio" sizes="(max-width: 640px) 25vw, 180px" imgClassName="object-top" />
                )}
                {m.type === "video" && (
                  <div className="absolute top-1.5 left-1.5">
                    <Video className="w-3.5 h-3.5 text-white drop-shadow" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Available Cities ── */}
      <div className="py-5 border-b">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Available In</h3>
        <div className="flex flex-wrap gap-1.5">
          {artist.cities.map((c) => (
            <span key={c} className="flex items-center gap-1 text-xs bg-gray-50 border rounded-full px-2.5 py-1 text-gray-700">
              <MapPin className="w-3 h-3 text-navy-400" />{c}
            </span>
          ))}
        </div>
      </div>

      {/* ── Quick Enquiry Form ── */}
      <div className="py-6">
        {submitted ? (
          <div className="text-center py-10">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="font-display text-xl font-bold text-navy-900">Enquiry Sent!</h3>
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
              Our coordinator will call you within <strong>2 hours</strong> to discuss booking <strong>{artist.user.name}</strong>.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-200">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md shrink-0`}>
                <Mic2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-navy-900 text-base">Book {artist.user.name}</h3>
                <p className="text-xs text-muted-foreground">Free enquiry · Our team calls within 2 hours</p>
              </div>
            </div>

            {!sessionUser ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
                  <p className="text-sm text-navy-900 font-medium">Sign in to send a free enquiry for {artist.user.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">It takes under a minute — we just need to verify your email first.</p>
                </div>
                <a href={`/enquiry?artist=${encodeURIComponent(artist.user.name)}`}>
                  <Button size="lg" variant="bare" className={`w-full bg-gradient-to-r ${color} text-white border-0 shadow-lg hover:opacity-90 font-bold text-base`}>
                    <Send className="w-4 h-4 mr-2" />
                    Start My Enquiry
                  </Button>
                </a>
                <p className="text-center text-xs text-muted-foreground">
                  Already have an account? <a href="/login" className="text-navy-700 font-medium hover:underline">Log in</a>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-900 truncate">{sessionUser.name}</p>
                    <p className="text-xs text-emerald-700 truncate">{sessionUser.email} · +91 {sessionUser.phone}</p>
                  </div>
                  <a href="/client" className="text-xs text-emerald-600 hover:underline shrink-0">My account</a>
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
                  <Combobox
                    options={cities.map((c) => ({ value: c.name, label: `${c.name}, ${c.state}` }))}
                    onValueChange={(v) => setValue("city", v)}
                    placeholder="Select city..."
                    searchPlaceholder="Search cities..."
                    className={errors.city ? "border-destructive" : ""}
                  />
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

                <div className="flex items-center gap-2 p-3 rounded-xl bg-navy-50 border border-navy-100">
                  <CheckCircle2 className="w-4 h-4 text-navy-600 shrink-0" />
                  <p className="text-xs text-navy-700">
                    <span className="font-semibold">{artist.user.name}</span> will be added to your enquiry automatically
                  </p>
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  size="lg"
                  variant="bare"
                  className={`w-full bg-gradient-to-r ${color} text-white border-0 shadow-lg hover:opacity-90 font-bold text-base`}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Enquiry — It&apos;s Free
                </Button>

                <p className="text-center text-xs text-muted-foreground pb-2">No payment required now · Our team calls within 2 hours</p>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
