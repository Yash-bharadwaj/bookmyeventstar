import type { MetadataRoute } from "next";
import { adminDb } from "@/lib/firebase/admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookmyeventstar.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/artists`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/enquiry`, changeFrequency: "monthly", priority: 0.8 },
  ];

  const artistsSnap = await adminDb
    .collection("artistProfiles")
    .where("is_verified", "==", true)
    .where("is_listed", "==", true)
    .get();

  const artistRoutes: MetadataRoute.Sitemap = artistsSnap.docs
    .filter((doc) => !!doc.data().slug)
    .map((doc) => {
      const slug = doc.data().slug as string;
      const updatedAt = doc.data().updated_at?.toDate?.() as Date | undefined;
      return {
        url: `${SITE_URL}/artists/${slug}`,
        ...(updatedAt ? { lastModified: updatedAt } : {}),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    });

  return [...staticRoutes, ...artistRoutes];
}
