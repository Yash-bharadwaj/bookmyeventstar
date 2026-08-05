import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/firebase/server";
import { createShareLink } from "@/lib/firebase/share-links";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookmyeventstar.com";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "coordinator")) {
    return NextResponse.json({ error: "Admin or coordinator access required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const artistIds = Array.isArray(body?.artistIds)
    ? body.artistIds.filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    : [];
  if (artistIds.length === 0) {
    return NextResponse.json({ error: "At least one artist id is required" }, { status: 400 });
  }

  const label = typeof body?.label === "string" && body.label.trim() ? body.label.trim() : undefined;
  const expiresInDays =
    typeof body?.expiresInDays === "number" && body.expiresInDays > 0 ? body.expiresInDays : undefined;

  const token = await createShareLink({
    artistIds,
    createdBy: user.id,
    createdByRole: user.role as "admin" | "coordinator",
    label,
    expiresInDays,
  });

  return NextResponse.json({ token, url: `${SITE_URL}/share/${token}` });
}
