import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";
import { notifyAdminsAndCoordinatorsServer } from "@/lib/notifications/server";

/**
 * Fired once by an artist's own client (ArtistProfileClient.tsx) the moment
 * their profile completeness flips false -> true — notifies every admin and
 * coordinator that a profile is ready to review and verify. Re-checks
 * is_profile_complete against Firestore itself (not just the caller's say-so)
 * before sending anything, since this is reachable by any signed-in artist.
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const decoded = token ? await adminAuth.verifyIdToken(token).catch(() => null) : null;
  if (!decoded) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const [userDoc, profileDoc] = await Promise.all([
    adminDb.collection("users").doc(decoded.uid).get(),
    adminDb.collection("artistProfiles").doc(decoded.uid).get(),
  ]);
  if (!userDoc.exists || userDoc.data()?.role !== "artist") {
    return NextResponse.json({ error: "Not an artist account" }, { status: 403 });
  }
  if (!profileDoc.exists || profileDoc.data()?.is_profile_complete !== true) {
    return NextResponse.json({ success: true, skipped: true });
  }

  const name = (userDoc.data()?.name as string | undefined)?.trim() || "An artist";
  const category = (profileDoc.data()?.categories as string[] | undefined)?.[0];

  notifyAdminsAndCoordinatorsServer(
    {
      title: `Profile ready for review — ${name}`,
      message: `${name}${category ? ` (${category})` : ""} just completed their artist profile and is ready to be reviewed and verified.`,
      type: "info",
    },
    undefined,
    (role) => (role === "admin" ? "/admin/artists" : "/coordinator/verify-artists")
  ).catch((err) => {
    console.error("[notifications/profile-complete] failed:", err);
  });

  return NextResponse.json({ success: true });
}
