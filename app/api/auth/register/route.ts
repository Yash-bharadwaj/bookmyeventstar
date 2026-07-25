import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";

const PRIVILEGED_ROLES = ["coordinator", "admin"];

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password, role } = await req.json();

    // Basic server-side validation
    if (!name || !email || !password || !phone || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!["client", "artist", "coordinator", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Creating a coordinator or admin account is a privileged action — the
    // caller must already be signed in as an admin. Client/artist signup
    // (the public /register page) is unauthenticated by design and skips
    // this check entirely.
    if (PRIVILEGED_ROLES.includes(role)) {
      const cookieStore = await cookies();
      const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      const caller = token ? await adminAuth.verifyIdToken(token).catch(() => null) : null;
      const callerDoc = caller ? await adminDb.collection("users").doc(caller.uid).get() : null;
      const callerRole = callerDoc?.exists ? (callerDoc.data()?.role as string | undefined) : undefined;
      if (callerRole !== "admin") {
        return NextResponse.json({ error: "Only admins can create this account type." }, { status: 403 });
      }
    }

    let userId: string;
    try {
      const authUser = await adminAuth.createUser({ email, password, displayName: name });
      userId = authUser.uid;
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/email-already-exists") {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
      if (code === "auth/invalid-password") {
        return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
      }
      console.error("[register] createUser error:", err);
      return NextResponse.json({ error: "Could not create account — please try again." }, { status: 400 });
    }

    await adminAuth.setCustomUserClaims(userId, { role });

    const phone_e164 = String(phone).startsWith("+91") ? phone : "+91" + phone;

    try {
      await adminDb.collection("users").doc(userId).set({
        name,
        email,
        phone: phone_e164,
        role,
        is_active: true,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      if (role === "artist") {
        await adminDb.collection("artistProfiles").doc(userId).set({
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
      // Roll back the auth user if profile creation fails
      await adminAuth.deleteUser(userId).catch(() => {});
      console.error("[register] profile write failed:", err);
      return NextResponse.json({ error: "Failed to create profile. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Unexpected error. Please try again." }, { status: 500 });
  }
}
