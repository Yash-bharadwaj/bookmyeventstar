"use client";

import { useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Camera, Plus, X, Save, Star, CheckCircle2, Upload, Loader2, Image as ImageIcon, Video, EyeOff, AlertCircle } from "lucide-react";
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
import { evaluateArtistProfile, type ArtistProfileCompletionInput } from "@/lib/artist-profile-completion";
import { ProfileCompletionGauge } from "@/components/artist/ProfileCompletionGauge";

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
  media?: ArtistMedia[];
}

export function ArtistProfileClient({ user, artistProfile, media: initialMedia = [] }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url ?? null);
  const [mediaList, setMediaList] = useState<ArtistMedia[]>(initialMedia);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    artistProfile?.categories ?? []
  );
  const [selectedCities, setSelectedCities] = useState<string[]>(
    artistProfile?.cities ?? []
  );

  const { register, handleSubmit, watch, getValues, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: artistProfile?.bio ?? "",
      base_price: artistProfile?.base_price ?? 0,
      rider_notes: artistProfile?.rider_notes ?? "",
      instagram: artistProfile?.social_links?.instagram ?? "",
      youtube: artistProfile?.social_links?.youtube ?? "",
    },
  });

  const wBio = watch("bio");
  const wBasePrice = watch("base_price");
  const wInstagram = watch("instagram");
  const wYoutube = watch("youtube");
  const wRiderNotes = watch("rider_notes");

  const photos = mediaList.filter((m) => m.type === "photo");
  const videos = mediaList.filter((m) => m.type === "video");

  const flushProfileCompleteToDb = async (explicitPhotoCount?: number, explicitHasAvatar?: boolean) => {
    if (!artistProfile?.id) return;
    const supabase = createClient();
    const snap: ArtistProfileCompletionInput = {
      bio: getValues("bio") ?? "",
      base_price: Number(getValues("base_price")) || 0,
      categories: selectedCategories,
      cities: selectedCities,
      photoCount: explicitPhotoCount ?? photos.length,
      hasAvatar: explicitHasAvatar ?? !!avatarUrl,
      instagram: getValues("instagram"),
      youtube: getValues("youtube"),
      rider_notes: getValues("rider_notes"),
    };
    const { isComplete } = evaluateArtistProfile(snap);
    await supabase.from("artist_profiles").update({ is_profile_complete: isComplete }).eq("id", artistProfile.id);
  };

  const liveCompletion = useMemo(() => {
    const snap: ArtistProfileCompletionInput = {
      bio: wBio ?? "",
      base_price: Number(wBasePrice) || 0,
      categories: selectedCategories,
      cities: selectedCities,
      photoCount: photos.length,
      hasAvatar: !!avatarUrl,
      instagram: wInstagram,
      youtube: wYoutube,
      rider_notes: wRiderNotes,
    };
    return evaluateArtistProfile(snap);
  }, [wBio, wBasePrice, wInstagram, wYoutube, wRiderNotes, selectedCategories, selectedCities, photos.length, avatarUrl]);

  const uploadAvatar = async (file: File) => {
    if (!file) return;
    setUploadingAvatar(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `profile/${user.id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("artist-media")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (upErr) {
      toast.error("Failed to upload photo: " + upErr.message);
      setUploadingAvatar(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("artist-media").getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: dbErr } = await supabase.from("users").update({ avatar_url: publicUrl }).eq("id", user.id);
    if (dbErr) {
      toast.error("Failed to save photo");
      setUploadingAvatar(false);
      return;
    }
    setAvatarUrl(publicUrl);
    toast.success("Profile photo updated!");
    await flushProfileCompleteToDb(undefined, true);
    setUploadingAvatar(false);
    router.refresh();
  };

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
      const { isComplete } = evaluateArtistProfile({
        bio: data.bio,
        base_price: data.base_price,
        categories: selectedCategories,
        cities: selectedCities,
        photoCount: photos.length,
        hasAvatar: !!avatarUrl,
        instagram: data.instagram,
        youtube: data.youtube,
        rider_notes: data.rider_notes,
      });
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
          is_profile_complete: isComplete,
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

  const uploadMedia = async (files: FileList) => {
    if (!artistProfile?.id) {
      toast.error("Complete your profile first");
      return;
    }
    setUploading(true);
    const supabase = createClient();
    let aggregated = [...mediaList];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const ext = file.name.split(".").pop();
      const path = `${artistProfile.id}/${Date.now()}.${ext}`;
      const { data: upload, error: upErr } = await supabase.storage
        .from("artist-media")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) {
        toast.error(`Failed to upload ${file.name}: ${upErr.message}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from("artist-media").getPublicUrl(path);
      const { data: record, error: dbErr } = await supabase
        .from("artist_media")
        .insert({
          artist_id: artistProfile.id,
          type: isVideo ? "video" : "photo",
          url: urlData.publicUrl,
          title: file.name,
          is_primary: mediaList.length === 0,
        })
        .select()
        .single();
      if (!dbErr && record) {
        aggregated = [...aggregated, record as ArtistMedia];
        setMediaList(aggregated);
        toast.success(`${file.name} uploaded!`);
      }
    }
    const photoCount = aggregated.filter((m) => m.type === "photo").length;
    await flushProfileCompleteToDb(photoCount);
    setUploading(false);
    router.refresh();
  };

  const deleteMedia = async (item: ArtistMedia) => {
    setDeletingId(item.id);
    const supabase = createClient();
    // Extract storage path from URL
    const urlParts = item.url.split("/artist-media/");
    if (urlParts.length > 1) {
      await supabase.storage.from("artist-media").remove([urlParts[1]]);
    }
    await supabase.from("artist_media").delete().eq("id", item.id);
    const next = mediaList.filter((m) => m.id !== item.id);
    setMediaList(next);
    const photoCount = next.filter((m) => m.type === "photo").length;
    await flushProfileCompleteToDb(photoCount);
    toast.success("Removed");
    setDeletingId(null);
    router.refresh();
  };

  const setPrimary = async (id: string) => {
    if (!artistProfile?.id) return;
    const supabase = createClient();
    await supabase.from("artist_media").update({ is_primary: false }).eq("artist_id", artistProfile.id);
    await supabase.from("artist_media").update({ is_primary: true }).eq("id", id);
    setMediaList((prev) => prev.map((m) => ({ ...m, is_primary: m.id === id })));
    toast.success("Primary photo set!");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {artistProfile && (
        <ProfileCompletionGauge
          percent={liveCompletion.percent}
          isComplete={liveCompletion.isComplete}
          items={liveCompletion.items}
          verified={artistProfile.is_verified}
          listed={artistProfile.is_listed !== false}
          showOnExplore={
            liveCompletion.isComplete &&
            !!artistProfile.is_verified &&
            artistProfile.is_listed !== false
          }
        />
      )}
      {artistProfile && artistProfile.is_listed === false && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex items-start gap-2">
          <EyeOff className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-700" />
          <p>
            <span className="font-semibold">Hidden from browse.</span> Complete the checklist above; an admin must list your
            profile for you to appear. Until checklist + verified + listed, clients won&apos;t see you on explore — existing bookings
            stay as they are.
          </p>
        </div>
      )}
      {/* Profile header — only avatar overlaps the banner; text stays on solid card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border bg-card shadow-sm overflow-hidden"
      >
        <div className="h-24 sm:h-28 navy-gradient relative">
          <div className="absolute inset-0 gold-shimmer bg-gold-shimmer bg-[length:200%_100%] animate-shimmer opacity-20 pointer-events-none" />
        </div>
        <div className="relative z-[1] px-4 sm:px-6 pb-6 pt-3 bg-card">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end sm:gap-6">
            <div className="-mt-12 sm:-mt-14 relative z-[2] shrink-0 self-start sm:self-auto">
              {/* Hidden avatar file input */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="group relative w-[4.75rem] h-[4.75rem] sm:w-20 sm:h-20 rounded-2xl border-4 border-card shadow-lg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                title="Upload profile photo"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex flex-col items-center justify-center gap-0.5 ${uploadingAvatar ? "gold-gradient" : "bg-amber-50 border-2 border-dashed border-amber-400"}`}>
                    {uploadingAvatar ? (
                      <Loader2 className="w-5 h-5 text-navy-900 animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-amber-500" />
                        <span className="text-[9px] font-semibold text-amber-600 leading-tight">Add Photo</span>
                      </>
                    )}
                  </div>
                )}
                {/* Hover overlay */}
                {avatarUrl && !uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                )}
                {uploadingAvatar && avatarUrl && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </button>
              {/* Required badge when no photo */}
              {!avatarUrl && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
                  Required
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2 sm:pb-0.5">
              <h2 className="font-display text-lg sm:text-xl font-bold text-navy-900 truncate">
                {user.name}
              </h2>
              <p className="text-muted-foreground text-sm break-all">{user.email}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {artistProfile?.is_verified ? (
                  <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Verified Artist
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Profile under review</div>
                )}
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-gold-500 text-gold-500 shrink-0" />
                  <span className="text-xs font-medium">{(artistProfile?.rating ?? 0).toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {!avatarUrl && (
    <button
      type="button"
      onClick={() => avatarInputRef.current?.click()}
      className="w-full rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/60 px-4 py-3.5 flex items-center gap-3 hover:bg-amber-50 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-5 h-5 text-amber-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-amber-900">Profile photo required</p>
        <p className="text-xs text-amber-700 mt-0.5">Tap to upload a photo. Clients can&apos;t book artists without a profile picture.</p>
      </div>
      <div className="ml-auto flex items-center gap-1.5 text-amber-700 text-xs font-semibold flex-shrink-0">
        <Camera className="w-4 h-4" />Upload
      </div>
    </button>
  )}

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
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && uploadMedia(e.target.files)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-1" />Upload</>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {photos.length === 0 && videos.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/40 hover:bg-accent/20 transition-all"
              >
                <Camera className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Click to upload photos and videos</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, MP4 up to 50MB each</p>
              </button>
            ) : (
              <>
                {photos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />Photos ({photos.length})
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {photos.map((photo) => (
                        <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group border">
                          <img src={photo.url} alt={photo.title ?? ""} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {!photo.is_primary && (
                              <button
                                type="button"
                                onClick={() => setPrimary(photo.id)}
                                className="text-[10px] px-2 py-1 bg-amber-500 text-white rounded font-medium"
                              >
                                Set Primary
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteMedia(photo)}
                              disabled={deletingId === photo.id}
                              className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center"
                            >
                              {deletingId === photo.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                            </button>
                          </div>
                          {photo.is_primary && (
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded">
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                )}
                {videos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5" />Videos ({videos.length})
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {videos.map((v) => (
                        <div key={v.id} className="relative rounded-xl overflow-hidden border group">
                          <video src={v.url} className="w-full aspect-video object-cover" controls />
                          <button
                            type="button"
                            onClick={() => deleteMedia(v)}
                            disabled={deletingId === v.id}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {deletingId === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
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
