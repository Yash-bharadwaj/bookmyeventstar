import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";
import { notifyAllAdminsServer } from "@/lib/notifications/server";
import { sendEmail, artistWelcomeEmailHtml } from "@/lib/email/resend";

const PRIVILEGED_ROLES = ["coordinator", "admin"];

export async function POST(req: NextRequest) {
  try {
    const {
      name, email, phone, password, role,
      isEventManager, companyName, instagramHandle, websiteUrl, category,
      city, area, budgetMin, budgetMax,
    } = await req.json();

    // Basic server-side validation — password is only required for the
    // admin-createUser branch below; self-service client/artist signup
    // proves identity via a phone-verified session instead.
    if (!name || !email || !phone || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!["client", "artist", "coordinator", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    const categoryStr = String(category ?? "").trim() || null;
    if (role === "artist" && !categoryStr) {
      return NextResponse.json({ error: "Select what kind of artist you are." }, { status: 400 });
    }
    const cityStr = String(city ?? "").trim() || null;
    const areaStr = String(area ?? "").trim() || null;
    const budgetMinNum = Number(budgetMin) || 0;
    const budgetMaxNum = budgetMax != null ? Number(budgetMax) || null : null;

    const isManager = role === "client" && Boolean(isEventManager);
    const companyStr = String(companyName ?? "").trim() || null;
    const igStr = String(instagramHandle ?? "").trim().replace(/^@/, "") || null;
    const websiteStr = String(websiteUrl ?? "").trim() || null;
    if (isManager) {
      if (!companyStr) return NextResponse.json({ error: "Enter your company / agency name." }, { status: 400 });
      if (!igStr) return NextResponse.json({ error: "Instagram handle is required." }, { status: 400 });
    }

    // Resolve the caller's own role once — used both for the privileged-role
    // gate below and to let an admin skip the client phone-OTP requirement
    // when creating an account on someone's behalf (e.g. from Admin > Users).
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const caller = sessionToken ? await adminAuth.verifyIdToken(sessionToken).catch(() => null) : null;
    const callerDoc = caller ? await adminDb.collection("users").doc(caller.uid).get() : null;
    const callerRole = callerDoc?.exists ? (callerDoc.data()?.role as string | undefined) : undefined;

    // Creating a coordinator or admin account is a privileged action — the
    // caller must already be signed in as an admin. Client/artist signup
    // (the public /register page) is unauthenticated by design and skips
    // this check entirely.
    if (PRIVILEGED_ROLES.includes(role) && callerRole !== "admin") {
      return NextResponse.json({ error: "Only admins can create this account type." }, { status: 403 });
    }

    // Location + starting budget are compulsory on the self-service artist
    // signup form — an admin adding an artist from Admin > Users doesn't go
    // through that form, so this stays skippable there, same as the phone
    // verification gate below.
    if (role === "artist" && callerRole !== "admin") {
      if (!cityStr) return NextResponse.json({ error: "Select your city." }, { status: 400 });
      if (!areaStr) return NextResponse.json({ error: "Enter your area / locality." }, { status: 400 });
      if (budgetMinNum < 2000) return NextResponse.json({ error: "Select your starting price range." }, { status: 400 });
    }

    const phone_e164 = String(phone).startsWith("+91") ? phone : "+91" + phone;
    const isSelfServiceSignup = (role === "client" || role === "artist") && callerRole !== "admin";

    let userId: string;
    if (isSelfServiceSignup) {
      // Client/artist self-signup proves identity via Firebase Phone Auth
      // (SMS OTP) with an email/password credential linked to that same
      // account client-side — the session cookie here IS the proof, so
      // there's no password to create an account with in this branch; the
      // Firebase Auth user already exists.
      if (!caller) {
        return NextResponse.json({ error: "Please verify your mobile number before creating an account." }, { status: 403 });
      }
      if (caller.phone_number !== phone_e164) {
        return NextResponse.json({ error: "Mobile number doesn't match the verified session." }, { status: 403 });
      }
      if (String(caller.email ?? "").toLowerCase() !== String(email).toLowerCase()) {
        return NextResponse.json({ error: "Email doesn't match the verified session." }, { status: 403 });
      }
      const existing = await adminDb.collection("users").doc(caller.uid).get();
      if (existing.exists) {
        return NextResponse.json({ error: "This mobile number is already registered — please log in instead." }, { status: 409 });
      }
      // Belt-and-suspenders on top of Firebase Auth's own phone-credential
      // uniqueness (which the client-side signInWithPhoneNumber call already
      // relies on): also check Firestore directly, since an older account
      // created before phone verification existed could have this same
      // number stored as never-actually-linked text, which Firebase Auth's
      // own uniqueness check can't see (a fresh phone-verified uid wouldn't
      // collide with it there).
      const phoneClash = await adminDb.collection("users").where("phone", "==", phone_e164).limit(1).get();
      if (!phoneClash.empty && phoneClash.docs[0].id !== caller.uid) {
        return NextResponse.json({ error: "This mobile number is already registered — please log in instead." }, { status: 409 });
      }
      userId = caller.uid;
    } else {
      if (!password) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }
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
    }

    await adminAuth.setCustomUserClaims(userId, { role });

    try {
      await adminDb.collection("users").doc(userId).set({
        name,
        email,
        phone: phone_e164,
        role,
        is_active: true,
        ...(role === "client" && {
          is_event_manager: isManager,
          company_name: companyStr,
          instagram_handle: igStr,
          website_url: websiteStr,
        }),
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      if (role === "artist") {
        await adminDb.collection("artistProfiles").doc(userId).set({
          bio: "",
          categories: categoryStr ? [categoryStr] : [],
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
      // Roll back the auth user if profile creation fails — but only one we
      // created ourselves above. A self-service signup's Auth user already
      // existed before this call (phone-verified client-side), so leaving it
      // in place just means a retry can complete the same account.
      if (!isSelfServiceSignup) await adminAuth.deleteUser(userId).catch(() => {});
      console.error("[register] profile write failed:", err);
      return NextResponse.json({ error: "Failed to create profile. Please try again." }, { status: 500 });
    }

    // Only for genuine self-registration — an admin adding a user from
    // Admin > Users already knows about it, no need to notify themselves.
    if ((role === "client" || role === "artist") && callerRole !== "admin") {
      const roleLabel = role === "artist" && categoryStr ? categoryStr : role;
      notifyAllAdminsServer({
        title: `New ${roleLabel} registered — ${name}`,
        message: `${name} (${email}, ${phone_e164}) just created a ${role} account${role === "artist" && categoryStr ? ` (${categoryStr})` : ""}.`,
        type: "info",
        link: "/admin/users",
      }).catch((err) => console.error("[register] admin notify failed:", err));
    }

    if (role === "artist") {
      sendEmail({
        to: email,
        subject: "Welcome to the Star Community! 🌟",
        html: artistWelcomeEmailHtml({ name, category: categoryStr ?? undefined }),
      }).catch((err) => console.error("[register] artist welcome email failed:", err));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Unexpected error. Please try again." }, { status: 500 });
  }
}
