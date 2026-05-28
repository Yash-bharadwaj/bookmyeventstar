import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Token helpers ────────────────────────────────────────────────────────────

function decodeToken(token: string): { phone: string } | null {
  try {
    const secret = process.env.OTP_TOKEN_SECRET;
    if (!secret) return null;
    const raw   = Buffer.from(token, "base64url").toString("utf-8");
    const parts = raw.split(":");
    if (parts.length !== 3) return null;
    const [phone, expiry, mac] = parts;
    if (Date.now() > Number(expiry)) return null;
    const expected = createHmac("sha256", secret).update(`${phone}:${expiry}`).digest("hex");
    return expected === mac ? { phone } : null;
  } catch {
    return null;
  }
}

// ── Friendly error mappers ────────────────────────────────────────────────────

function friendlyAuthErr(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists") || m.includes("duplicate")) {
    return "An account for this number already exists. Please log in instead.";
  }
  if (m.includes("weak_password") || (m.includes("password") && m.includes("short"))) {
    return "Password must be at least 8 characters.";
  }
  if (m.includes("invalid email")) return "Invalid email address.";
  return "Could not create account — please try again.";
}

function friendlyDbErr(code: string | undefined, msg: string): string {
  if (code === "23505") {
    if (msg.includes("email")) {
      return "This email is already linked to another account. Please use a different email.";
    }
    if (msg.includes("phone")) {
      return "An account with this phone number already exists. Please log in instead.";
    }
    return "This account already exists. Please log in instead.";
  }
  return "Could not save your profile — please try again.";
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── parse ────────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const {
    token, name, email, password, isEventManager,
    companyName, instagramHandle, websiteUrl,
  } = body as Record<string, unknown>;

  // ── validate token ────────────────────────────────────────────────────────
  const decoded = decodeToken(String(token ?? ""));
  if (!decoded) {
    return NextResponse.json(
      { error: "Your phone verification has expired. Please verify your number again." },
      { status: 400 }
    );
  }

  const { phone } = decoded;
  const e164          = `+91${phone}`;
  const internalEmail = `${phone}@phone.bmes.app`;

  // ── validate inputs ───────────────────────────────────────────────────────
  if (!String(name ?? "").trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  const emailStr = String(email ?? "").trim().toLowerCase();
  if (!emailStr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const passwordStr = String(password ?? "");
  if (passwordStr.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const nameStr       = String(name).trim();
  const isManager     = Boolean(isEventManager);
  const companyStr    = String(companyName ?? "").trim() || null;
  const igStr         = String(instagramHandle ?? "").trim().replace(/^@/, "") || null;
  const websiteStr    = String(websiteUrl ?? "").trim() || null;

  try {
    // ── returning user? ────────────────────────────────────────────────────
    const { data: existing, error: lookupErr } = await admin
      .from("users")
      .select("id")
      .eq("phone", e164)
      .maybeSingle();

    if (lookupErr) {
      console.error("[OTP/complete] phone lookup error:", lookupErr.message);
      return NextResponse.json(
        { error: "Could not verify your account status — please try again." },
        { status: 500 }
      );
    }

    if (existing) {
      // ── returning user: update password + profile ──────────────────────
      const { error: pwErr } = await admin.auth.admin.updateUserById(existing.id, {
        password: passwordStr,
      });
      if (pwErr) {
        console.error("[OTP/complete] updateUserById:", pwErr.message);
        return NextResponse.json(
          { error: "Could not update your password — please try again." },
          { status: 500 }
        );
      }

      // Update profile — try with new columns, silently fall back without them
      const fullUpdate = {
        name: nameStr, email: emailStr,
        is_event_manager: isManager,
        company_name: companyStr, instagram_handle: igStr, website_url: websiteStr,
      };
      const { error: upFull } = await admin.from("users").update(fullUpdate).eq("id", existing.id);
      if (upFull) {
        // Columns likely not migrated yet — update only base fields
        const { error: upBase } = await admin
          .from("users")
          .update({ name: nameStr, email: emailStr })
          .eq("id", existing.id);
        if (upBase) console.error("[OTP/complete] base update fallback error:", upBase.message);
      }

      return NextResponse.json({ email: internalEmail, password: passwordStr });
    }

    // ── new user: create auth account ──────────────────────────────────────
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: internalEmail,
      password: passwordStr,
      email_confirm: true,
      user_metadata: { name: nameStr },
    });

    if (authErr) {
      console.error("[OTP/complete] createUser:", authErr.message);
      return NextResponse.json({ error: friendlyAuthErr(authErr.message) }, { status: 409 });
    }

    const userId = authData.user.id;

    // ── insert profile ─────────────────────────────────────────────────────
    const fullInsert = {
      id: userId, name: nameStr, email: emailStr,
      phone: e164, role: "client", is_active: true,
      is_event_manager: isManager,
      company_name: companyStr, instagram_handle: igStr, website_url: websiteStr,
    };

    let { error: insErr } = await admin.from("users").insert(fullInsert);

    if (insErr && !["23505", "23503"].includes(insErr.code ?? "")) {
      // Likely migration columns missing — retry with base fields only
      const base = { id: userId, name: nameStr, email: emailStr, phone: e164, role: "client", is_active: true };
      const { error: insBase } = await admin.from("users").insert(base);
      insErr = insBase ?? null;
    }

    if (insErr) {
      // Roll back the auth user so they can retry
      await admin.auth.admin.deleteUser(userId).catch((e) =>
        console.error("[OTP/complete] deleteUser rollback failed:", e)
      );
      console.error("[OTP/complete] insert error:", insErr.code, insErr.message);
      return NextResponse.json({ error: friendlyDbErr(insErr.code, insErr.message) }, { status: 409 });
    }

    return NextResponse.json({ email: internalEmail, password: passwordStr });

  } catch (err) {
    console.error("[OTP/complete] unhandled:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end — please try again." },
      { status: 500 }
    );
  }
}
