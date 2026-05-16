"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Star, MapPin, IndianRupee, CheckCircle2, Check, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, getInitials, ARTIST_CATEGORIES, INDIA_CITIES } from "@/lib/utils";
import { ArtistProfile } from "@/types";

interface Props {
  artists: (ArtistProfile & {
    user: { name: string; email: string; phone: string; avatar_url?: string };
    media: { url: string; is_primary: boolean; type: string }[];
  })[];
}

export function ArtistSearchClient({ artists }: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());

  const filtered = artists.filter((a) => {
    const matchSearch =
      a.user.name.toLowerCase().includes(search.toLowerCase()) ||
      a.categories.some((c) => c.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = categoryFilter === "all" || a.categories.includes(categoryFilter);
    const matchCity = cityFilter === "all" || a.cities.includes(cityFilter);
    return matchSearch && matchCategory && matchCity;
  });

  const toggleShortlist = (id: string) => {
    setShortlisted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const primaryPhoto = (artist: Props["artists"][0]) =>
    artist.media.find((m) => m.is_primary && m.type === "photo")?.url;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search artists by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {ARTIST_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {INDIA_CITIES.map((c) => (
              <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {shortlisted.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-gold-50 border border-gold-200">
          <span className="text-sm font-medium text-gold-800">
            {shortlisted.size} artist{shortlisted.size > 1 ? "s" : ""} shortlisted
          </span>
          <Button size="sm">Create Proposal</Button>
        </div>
      )}

      <div className="text-sm text-muted-foreground">{filtered.length} artists found</div>

      {/* Artist grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((artist, i) => {
          const isShortlisted = shortlisted.has(artist.id);
          const photo = primaryPhoto(artist);
          return (
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card hover className={`overflow-hidden ${isShortlisted ? "ring-2 ring-gold-500" : ""}`}>
                {/* Photo */}
                <div className="relative h-48 bg-gradient-to-br from-navy-900 to-navy-700 flex items-center justify-center">
                  {photo ? (
                    <img src={photo} alt={artist.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-full gold-gradient flex items-center justify-center text-navy-900 font-bold text-2xl">
                      {getInitials(artist.user.name)}
                    </div>
                  )}
                  {artist.is_verified && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <button
                    onClick={() => toggleShortlist(artist.id)}
                    className={`absolute top-2 left-2 px-2.5 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                      isShortlisted
                        ? "bg-indigo-600 text-white"
                        : "bg-black/40 text-white hover:bg-indigo-600"
                    }`}
                  >
                    {isShortlisted ? <><Check className="w-3 h-3" /> Shortlisted</> : <><Plus className="w-3 h-3" /> Shortlist</>}
                  </button>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-display font-semibold text-base truncate">{artist.user.name}</h3>

                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3.5 h-3.5 fill-gold-500 text-gold-500" />
                    <span className="text-sm font-medium">{artist.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({artist.total_bookings} events)</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {artist.categories.slice(0, 2).map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                    ))}
                    {artist.categories.length > 2 && (
                      <Badge variant="outline" className="text-[10px]">+{artist.categories.length - 2}</Badge>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm font-semibold text-gold-700">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {formatCurrency(artist.base_price).replace("₹", "")}
                      <span className="text-xs text-muted-foreground font-normal">onwards</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {artist.cities.slice(0, 1).join(", ")}
                      {artist.cities.length > 1 && ` +${artist.cities.length - 1}`}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs">
                      View Profile
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => toggleShortlist(artist.id)}
                      variant={isShortlisted ? "secondary" : "default"}
                    >
                      {isShortlisted ? "Remove" : "Shortlist"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-muted-foreground">No artists found matching your criteria</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setCategoryFilter("all"); setCityFilter("all"); }}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
