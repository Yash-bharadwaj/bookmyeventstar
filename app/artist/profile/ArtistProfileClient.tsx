"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Camera, Plus, X, Save, Star, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ArtistProfile, ArtistMedia, User } from "@/types";
import { ARTIST_CATEGORIES, INDIA_CITIES, formatCurrency, getInitials } from "@/lib/utils";

const profileSchema = z.object({
  bio: z.string().min(20, "Bio must be at least 20 characters"),
  base_price: z.number().min(1000, "Minimum price is ₹1,000"),
  rider_notes: z.string().optional(),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface Props {
  user: User;
  artistProfile: ArtistProfile | null;
  media: ArtistMedia[];
}

export function ArtistProfileClient({ user, artistProfile, media }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    artistProfile?.categories ?? []
  );
  const [selectedCities, setSelectedCities] = useState<string[]>(
    artistProfile?.cities ?? []
  );

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: artistProfile?.bio ?? "",
      base_price: artistProfile?.base_price ?? 0,
      rider_notes: artistProfile?.rider_notes ?? "",
      instagram: artistProfile?.social_links?.instagram ?? "",
      youtube: artistProfile?.social_links?.youtube ?? "",
    },
  });

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase
        .from("artist_profiles")
        .update({
          bio: data.bio,
          categories: selectedCategories,
          cities: selectedCities,
          base_price: data.base_price,
          rider_notes: data.rider_notes,
          social_links: {
            instagram: data.instagram,
            youtube: data.youtube,
          },
        })
        .eq("user_id", user.id);

      toast.success("Profile updated successfully!");
      router.refresh();
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const photos = media.filter((m) => m.type === "photo");
  const videos = media.filter((m) => m.type === "video");

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden border"
      >
        <div className="h-32 navy-gradient relative">
          <div className="absolute inset-0 gold-shimmer bg-gold-shimmer bg-[length:200%_100%] animate-shimmer opacity-20" />
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl gold-gradient border-4 border-background flex items-center justify-center text-navy-900 font-bold text-2xl shadow-xl">
              {getInitials(user.name)}
            </div>
            <div className="pb-2">
              <h2 className="font-display text-xl font-bold">{user.name}</h2>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {artistProfile?.is_verified ? (
                  <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Artist
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Profile under review</div>
                )}
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-gold-500 text-gold-500" />
                  <span className="text-xs font-medium">{(artistProfile?.rating ?? 0).toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Bio & Pricing */}
        <Card>
          <CardHeader><CardTitle>About You</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Bio / Introduction *</Label>
              <Textarea
                placeholder="Write a compelling bio — your experience, style, notable performances..."
                rows={4}
                error={errors.bio?.message}
                {...register("bio")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Base Price (₹) — Starting from *</Label>
              <Input
                type="number"
                placeholder="e.g. 50000"
                error={errors.base_price?.message}
                {...register("base_price")}
              />
              <p className="text-xs text-muted-foreground">This is the starting price shown to clients</p>
            </div>
            <div className="space-y-1.5">
              <Label>Rider / Performance Requirements</Label>
              <Textarea
                placeholder="e.g. Sound system requirements, hotel accommodation, transport..."
                rows={3}
                {...register("rider_notes")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader><CardTitle>Your Categories *</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ARTIST_CATEGORIES.map((cat) => {
                const selected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selected
                        ? "gold-gradient text-navy-900 shadow-sm"
                        : "border border-border hover:border-gold-400 text-muted-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            {selectedCategories.length === 0 && (
              <p className="mt-3 text-xs text-destructive">Select at least one category</p>
            )}
          </CardContent>
        </Card>

        {/* Cities */}
        <Card>
          <CardHeader><CardTitle>Cities You Perform In *</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {INDIA_CITIES.map((city) => {
                const selected = selectedCities.includes(city.name);
                return (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => toggleCity(city.name)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selected
                        ? "bg-navy-900 text-white shadow-sm"
                        : "border border-border hover:border-navy-400 text-muted-foreground"
                    }`}
                  >
                    {city.name}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader><CardTitle>Social Media Links</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Instagram Profile URL</Label>
              <Input placeholder="https://instagram.com/yourprofile" {...register("instagram")} />
            </div>
            <div className="space-y-1.5">
              <Label>YouTube Channel URL</Label>
              <Input placeholder="https://youtube.com/@yourchannel" {...register("youtube")} />
            </div>
          </CardContent>
        </Card>

        {/* Media Gallery */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Photos & Videos</CardTitle>
              <Button type="button" size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Upload
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {photos.length === 0 && videos.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
                <Camera className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Upload photos and videos to showcase your talent</p>
                <Button type="button" variant="outline" className="mt-4" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Media
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={photo.url} alt={photo.title ?? ""} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {photo.is_primary && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-gold-500 text-navy-900 text-[10px] font-bold rounded">
                        Primary
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} size="lg">
            <Save className="w-4 h-4 mr-2" />
            Save Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
