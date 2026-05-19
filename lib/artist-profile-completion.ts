/** Single source for “can show on client / coordinator browse”. */

import type { ArtistProfile } from "@/types";

export type ArtistProfileCompletionItem = {
  id: string;
  label: string;
  hint: string;
  weight: number;
  done: boolean;
};

export type ArtistProfileCompletionInput = {
  bio: string;
  base_price: number;
  categories: string[];
  cities: string[];
  photoCount: number;
  hasAvatar?: boolean;
  instagram?: string;
  youtube?: string;
  rider_notes?: string;
};

export function evaluateArtistProfile(input: ArtistProfileCompletionInput): {
  percent: number;
  isComplete: boolean;
  items: ArtistProfileCompletionItem[];
} {
  const ig = (input.instagram ?? "").trim();
  const yt = (input.youtube ?? "").trim();
  const rider = (input.rider_notes ?? "").trim();

  const items: ArtistProfileCompletionItem[] = [
    {
      id: "profile_photo",
      label: "Profile photo",
      hint: "Upload a clear profile photo — clients need to see who they're booking.",
      weight: 20,
      done: !!input.hasAvatar,
    },
    {
      id: "bio",
      label: "Bio",
      hint: "Write at least 20 characters.",
      weight: 17,
      done: input.bio.trim().length >= 20,
    },
    {
      id: "price",
      label: "Starting price",
      hint: "Set base price ₹1,000 or more.",
      weight: 14,
      done: Number(input.base_price) >= 1000,
    },
    {
      id: "categories",
      label: "Categories",
      hint: "Pick at least one performance type.",
      weight: 13,
      done: input.categories.length >= 1,
    },
    {
      id: "cities",
      label: "Cities",
      hint: "Pick at least one city you work in.",
      weight: 13,
      done: input.cities.length >= 1,
    },
    {
      id: "photos",
      label: "Portfolio photo",
      hint: "Upload at least one portfolio photo.",
      weight: 13,
      done: input.photoCount >= 1,
    },
    {
      id: "extra",
      label: "Extras",
      hint: "Add rider notes or an Instagram / YouTube link.",
      weight: 10,
      done: rider.length >= 10 || /^https?:\/\//i.test(ig) || /^https?:\/\//i.test(yt),
    },
  ];

  const percent = items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
  /** Core checklist only — extras bump % but do not hide artists from browse. */
  const isComplete = items
    .filter((i) => i.id !== "extra")
    .every((i) => i.done);
  return { percent, isComplete, items };
}

export function aggregateCompletionFromStoredProfile(
  p: Pick<
    ArtistProfile,
    "bio" | "base_price" | "categories" | "cities" | "social_links" | "rider_notes"
  > | null,
  photoCount: number,
  hasAvatar?: boolean
) {
  if (!p) {
    return evaluateArtistProfile({
      bio: "",
      base_price: 0,
      categories: [],
      cities: [],
      photoCount,
      hasAvatar,
    });
  }
  const sl = p.social_links ?? {};
  return evaluateArtistProfile({
    bio: p.bio ?? "",
    base_price: Number(p.base_price) || 0,
    categories: p.categories ?? [],
    cities: p.cities ?? [],
    photoCount,
    hasAvatar,
    instagram: typeof sl.instagram === "string" ? sl.instagram : undefined,
    youtube: typeof sl.youtube === "string" ? sl.youtube : undefined,
    rider_notes: p.rider_notes ?? "",
  });
}
