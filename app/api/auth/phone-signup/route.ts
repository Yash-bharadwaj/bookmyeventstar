import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// Called AFTER the client has already verified their phone number via real
// Firebase Phone Auth (signInWithPhoneNumber + confirm) and is signed in —
// this route's job is just to finish account setup: validate the rest of the
// profile, write the Firestore user doc, and set the `role` custom claim
// (which the client force-refreshes into its ID token right after this call,
// so the session cookie it syncs next actually carries the role).
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const {
    uid, name, email, phone, isEventManager,
    companyName, instagramHandle, websiteUrl,
  } = body;

  if (typeof uid !== "string" || !uid) {
    return NextResponse.json({ error: "Missing verified user." }, { status: 400 });
  }

  const nameStr = String(name ?? "").trim();
  if (!nameStr) return NextResponse.json({ error: "Enter your name." }, { status: 400 });

  const emailStr = String(email ?? "").trim().toLowerCase();
  if (!emailStr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const digits = String(phone ?? "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
  }

  const isManager  = Boolean(isEventManager);
  const companyStr = String(companyName ?? "").trim() || null;
  const igStr      = String(instagramHandle ?? "").trim().replace(/^@/, "") || null;
  const websiteStr = String(websiteUrl ?? "").trim() || null;

  if (isManager) {
    if (!companyStr) return NextResponse.json({ error: "Enter your company / agency name." }, { status: 400 });
    if (!igStr) return NextResponse.json({ error: "Instagram handle is required." }, { status: 400 });
  }

  try {
    // Confirm the uid is a real, currently-existing Firebase Auth user
    // (defends against a forged uid in the request body).
    let authUser;
    try {
      authUser = await adminAuth.getUser(uid);
    } catch {
      return NextResponse.json({ error: "Your phone verification has expired. Please try again." }, { status: 401 });
    }
    if (authUser.phoneNumber !== `+91${digits}`) {
      return NextResponse.json({ error: "Phone number mismatch — please try again." }, { status: 400 });
    }

    const userDocRef = adminDb.collection("users").doc(uid);
    if ((await userDocRef.get()).exists) {
      return NextResponse.json(
        { error: "An account with this phone number already exists. Please log in instead." },
        { status: 409 }
      );
    }

    const emailTaken = await adminDb.collection("users").where("email", "==", emailStr).limit(1).get();
    if (!emailTaken.empty) {
      return NextResponse.json(
        { error: "This email is already linked to another account. Please use a different email." },
        { status: 409 }
      );
    }

    await adminAuth.setCustomUserClaims(uid, { role: "client" });

    await userDocRef.set({
      name: nameStr,
      email: emailStr,
      phone: `+91${digits}`,
      role: "client",
      is_active: true,
      is_event_manager: isManager,
      company_name: companyStr,
      instagram_handle: igStr,
      website_url: websiteStr,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[phone-signup] unhandled:", err);
    return NextResponse.json({ error: "Something went wrong — please try again." }, { status: 500 });
  }
}
