import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";
import { cloudinary } from "@/lib/cloudinary/admin";

/**
 * Issues a signature for a direct browser-to-Cloudinary upload — the file
 * itself never passes through our server (fast, and avoids Vercel's
 * serverless function body-size limit that would otherwise cap video
 * uploads). The path is always derived from the caller's own uid server-side
 * and never taken from the request, so a signature can only ever authorize
 * writing to that caller's own folder.
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const type = body.type === "avatar" ? "avatar" : "media";

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign: Record<string, string | number | boolean> =
    type === "avatar"
      ? { public_id: `artist-media/profile/${decoded.uid}`, timestamp, overwrite: true }
      : { folder: `artist-media/${decoded.uid}`, timestamp };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);

  return NextResponse.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    ...(type === "avatar"
      ? { publicId: paramsToSign.public_id, overwrite: true }
      : { folder: paramsToSign.folder }),
  });
}
