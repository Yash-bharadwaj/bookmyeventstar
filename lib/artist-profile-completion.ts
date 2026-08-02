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
  hasAadhaar?: boolean;
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

  const items: ArtistProfileCompletionItem[] = [
    {
      id: "profile_photo",
      label: "Profile photo",
      hint: "Upload a clear profile photo — clients need to see who they're booking.",
      weight: 15,
      done: !!input.hasAvatar,
    },
    {
      id: "bio",
      label: "Bio",
      hint: "Write at least 20 characters.",
      weight: 14,
      done: input.bio.trim().length >= 20,
    },
    {
      id: "aadhaar",
      label: "Aadhaar Card",
      hint: "Upload your Aadhaar card under Documents — required for verification.",
      weight: 15,
      done: !!input.hasAadhaar,
    },
    {
      id: "price",
      label: "Starting price",
      hint: "Set base price ₹1,000 or more.",
      weight: 12,
      done: Number(input.base_price) >= 1000,
    },
    {
      id: "categories",
      label: "Categories",
      hint: "Pick at least one performance type.",
      weight: 11,
      done: input.categories.length >= 1,
    },
    {
      id: "cities",
      label: "Cities",
      hint: "Pick at least one city you work in.",
      weight: 11,
      done: input.cities.length >= 1,
    },
    {
      id: "photos",
      label: "Portfolio photo",
      hint: "Upload at least one portfolio photo.",
      weight: 12,
      done: input.photoCount >= 1,
    },
    {
      id: "instagram",
      label: "Instagram",
      hint: "Add your Instagram profile URL.",
      weight: 10,
      done: /^https?:\/\//i.test(ig),
    },
  ];

  const percent = items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
  // Every item is required for 100% / verification eligibility — nothing is
  // "bonus only" anymore (previously "extra" didn't count; that changed
  // alongside making Aadhaar mandatory).
  const isComplete = items.every((i) => i.done);
  return { percent, isComplete, items };
}

export function aggregateCompletionFromStoredProfile(
  p: Pick<
    ArtistProfile,
    "bio" | "base_price" | "categories" | "cities" | "social_links" | "rider_notes"
  > | null,
  photoCount: number,
  hasAvatar?: boolean,
  hasAadhaar?: boolean
) {
  if (!p) {
    return evaluateArtistProfile({
      bio: "",
      base_price: 0,
      categories: [],
      cities: [],
      photoCount,
      hasAvatar,
      hasAadhaar,
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
    hasAadhaar,
    instagram: typeof sl.instagram === "string" ? sl.instagram : undefined,
    youtube: typeof sl.youtube === "string" ? sl.youtube : undefined,
    rider_notes: p.rider_notes ?? "",
  });
}
