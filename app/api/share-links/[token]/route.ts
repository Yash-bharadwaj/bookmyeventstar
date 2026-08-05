import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/firebase/server";
import { revokeShareLink } from "@/lib/firebase/share-links";

export async function PATCH(_req: NextRequest, { params }: { params: { token: string } }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "coordinator")) {
    return NextResponse.json({ error: "Admin or coordinator access required" }, { status: 403 });
  }

  await revokeShareLink(params.token);
  return NextResponse.json({ success: true });
}
