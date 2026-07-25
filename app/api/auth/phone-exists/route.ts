import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Existence check only — used to gate whether the forgot-password flow sends
 * an SMS OTP at all, so we never trigger Firebase Phone Auth's "create a new
 * account" behavior for a number that isn't actually registered.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const digits = String(body.phone ?? "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
  }

  const snap = await adminDb.collection("users").where("phone", "==", `+91${digits}`).limit(1).get();
  return NextResponse.json({ exists: !snap.empty });
}
