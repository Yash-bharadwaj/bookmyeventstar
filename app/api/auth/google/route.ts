import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { notifyAllAdminsServer } from "@/lib/notifications/server";
import { sendEmail, artistWelcomeEmailHtml } from "@/lib/email/resend";

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
    const { idToken, phone, role, categories, city, area, budgetMin, budgetMax } = await req.json();

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
    const categoryList: string[] = Array.isArray(categories)
      ? categories.map((c) => String(c).trim()).filter(Boolean)
      : [];
    if (role === "artist" && categoryList.length === 0) {
      return NextResponse.json({ error: "Select what kind of artist you are." }, { status: 400 });
    }
    const cityStr = String(city ?? "").trim() || null;
    const areaStr = String(area ?? "").trim() || null;
    const budgetMinNum = Number(budgetMin) || 0;
    const budgetMaxNum = budgetMax != null ? Number(budgetMax) || null : null;
    if (role === "artist") {
      if (!cityStr) return NextResponse.json({ error: "Select your city." }, { status: 400 });
      if (!areaStr) return NextResponse.json({ error: "Enter your area / locality." }, { status: 400 });
      if (budgetMinNum < 2000) return NextResponse.json({ error: "Select your starting price range." }, { status: 400 });
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

    const phone_e164 = "+91" + digits;

    const userRef = adminDb.collection("users").doc(decoded.uid);
    const existing = await userRef.get();
    if (existing.exists) {
      // Client-side should never reach this route for an existing profile —
      // treat as a no-op success rather than an error.
      return NextResponse.json({ success: true });
    }

    // Phone isn't verified — Google's own email is the proven identity here
    // (Firebase Phone Auth SMS delivery to Indian numbers is unreliable, so
    // it's deliberately not used) — so uniqueness across accounts has to be
    // enforced explicitly via Firestore rather than relying on Firebase
    // Auth's own phone-credential dedup.
    const phoneClash = await adminDb.collection("users").where("phone", "==", phone_e164).limit(1).get();
    if (!phoneClash.empty) {
      return NextResponse.json({ error: "This mobile number is already registered — please log in instead." }, { status: 409 });
    }

    const name = decoded.name?.trim() || "New User";

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
          categories: categoryList,
          cities: cityStr ? [cityStr] : [],
          area: areaStr,
          base_price: budgetMinNum,
          budget_min: budgetMinNum || null,
          budget_max: budgetMaxNum,
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

    const categoryLabel = categoryList.join(", ");
    const roleLabel = role === "artist" && categoryLabel ? categoryLabel : role;
    notifyAllAdminsServer({
      title: `New ${roleLabel} registered — ${name}`,
      message: `${name} (${decoded.email}, ${phone_e164}) just created a ${role} account via Google${role === "artist" && categoryLabel ? ` (${categoryLabel})` : ""}.`,
      type: "info",
      link: "/admin/users",
    }).catch((err) => console.error("[auth/google] admin notify failed:", err));

    if (role === "artist") {
      sendEmail({
        to: decoded.email,
        subject: "Welcome to the Star Community! 🌟",
        html: artistWelcomeEmailHtml({ name, category: categoryLabel || undefined }),
      }).catch((err) => console.error("[auth/google] artist welcome email failed:", err));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[auth/google] failed:", err);
    return NextResponse.json({ error: "Unexpected error. Please try again." }, { status: 500 });
  }
}
