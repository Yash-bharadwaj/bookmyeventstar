"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Star, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArtistProfile } from "@/types";
import { formatCurrency, getInitials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface ArtistWithUser extends Omit<ArtistProfile, "user"> {
  user: { name: string; email: string; phone: string; is_active: boolean; avatar_url?: string };
}

export function AdminArtistsClient({ artists }: { artists: ArtistWithUser[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = artists.filter(
    (a) =>
      a.user.name.toLowerCase().includes(search.toLowerCase()) ||
      a.user.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleVerify = async (artistId: string, current: boolean) => {
    const supabase = createClient();
    await supabase
      .from("artist_profiles")
      .update({ is_verified: !current })
      .eq("id", artistId);
    toast.success(current ? "Artist unverified" : "Artist verified!");
    router.refresh();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search artists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              {["Artist", "Categories", "Rating", "Bookings", "Base Price", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((artist, i) => (
              <motion.tr
                key={artist.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="border-b last:border-0 hover:bg-accent/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center text-navy-900 font-bold text-sm flex-shrink-0">
                      {getInitials(artist.user.name)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{artist.user.name}</p>
                      <p className="text-xs text-muted-foreground">{artist.user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {artist.categories.slice(0, 2).map((c) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                    ))}
                    {artist.categories.length > 2 && (
                      <Badge variant="outline" className="text-[10px]">+{artist.categories.length - 2}</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-gold-500 text-gold-500" />
                    <span className="text-sm font-medium">{artist.rating.toFixed(1)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{artist.total_bookings}</td>
                <td className="px-4 py-3 text-sm font-medium">{formatCurrency(artist.base_price)}</td>
                <td className="px-4 py-3">
                  {artist.is_verified ? (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Verified
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <XCircle className="w-3.5 h-3.5" />
                      Unverified
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant={artist.is_verified ? "outline" : "default"}
                    className="text-xs h-7"
                    onClick={() => toggleVerify(artist.id, artist.is_verified)}
                  >
                    {artist.is_verified ? "Unverify" : "Verify"}
                  </Button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
