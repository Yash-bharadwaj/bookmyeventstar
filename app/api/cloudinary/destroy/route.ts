import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";
import { cloudinary } from "@/lib/cloudinary/admin";

/**
 * Deletes a Cloudinary asset. Only ever allowed for a public_id scoped to
 * the caller's own uid (artist-media/{profile/}?{uid}...), so one artist can
 * never delete another's media even if they forged the request.
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { publicId, resourceType } = await req.json().catch(() => ({}));
  if (typeof publicId !== "string") {
    return NextResponse.json({ error: "Missing publicId" }, { status: 400 });
  }

  const ownedPrefix = `artist-media/${decoded.uid}`;
  const ownedAvatar = `artist-media/profile/${decoded.uid}`;
  if (!publicId.startsWith(ownedPrefix) && publicId !== ownedAvatar) {
    return NextResponse.json({ error: "Not your media" }, { status: 403 });
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType === "video" ? "video" : "image",
      invalidate: true,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[cloudinary/destroy]:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
