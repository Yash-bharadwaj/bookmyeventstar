import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyAllAdminsServer } from "@/lib/notifications/server";

const PHONE_REGEX = /^[6-9]\d{9}$/;

/**
 * Finishes account setup for a brand-new Google sign-in. The Firebase Auth
 * user already exists by the time this runs (created client-side by
 * signInWithPopup) — this only ever creates the Firestore profile + role
 * claim, never a Firebase Auth user, so there's nothing to roll back on
 * failure. Uses .set() (not .create()) so a retry after a transient error is
 * always safe.
 */
export async function POST(req: NextRequest) {
  try {
    const { idToken, phone, role } = await req.json();

    if (typeof idToken !== "string" || !idToken) {
      return NextResponse.json({ error: "Missing sign-in token." }, { status: 400 });
    }
    if (!["client", "artist"].includes(role)) {
      return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
    }
    const digits = String(phone ?? "").replace(/\D/g, "");
    if (!PHONE_REGEX.test(digits)) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
    }

    let decoded: { uid: string; email?: string; email_verified?: boolean; name?: string };
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Your sign-in has expired — please try again." }, { status: 401 });
    }
    if (!decoded.email || !decoded.email_verified) {
      return NextResponse.json({ error: "Please use a Google account with a verified email." }, { status: 403 });
    }

    const userRef = adminDb.collection("users").doc(decoded.uid);
    const existing = await userRef.get();
    if (existing.exists) {
      // Client-side should never reach this route for an existing profile —
      // treat as a no-op success rather than an error.
      return NextResponse.json({ success: true });
    }

    const name = decoded.name?.trim() || "New User";
    const phone_e164 = "+91" + digits;

    await adminAuth.setCustomUserClaims(decoded.uid, { role });

    try {
      await userRef.set({
        name,
        email: decoded.email,
        phone: phone_e164,
        role,
        is_active: true,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      if (role === "artist") {
        await adminDb.collection("artistProfiles").doc(decoded.uid).set({
          bio: "",
          categories: [],
          cities: [],
          base_price: 0,
          pricing_details: {},
          rating: 0,
          total_bookings: 0,
          is_verified: false,
          is_listed: false,
          is_profile_complete: false,
          social_links: {},
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("[auth/google] profile write failed:", err);
      return NextResponse.json({ error: "Could not finish setting up your account. Please try again." }, { status: 500 });
    }

    notifyAllAdminsServer({
      title: `New ${role} registered — ${name}`,
      message: `${name} (${decoded.email}, ${phone_e164}) just created a ${role} account via Google.`,
      type: "info",
      link: "/admin/users",
    }).catch((err) => console.error("[auth/google] admin notify failed:", err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[auth/google] failed:", err);
    return NextResponse.json({ error: "Unexpected error. Please try again." }, { status: 500 });
  }
}
