import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Fixed dev password — all bypass accounts share this.
// Replace this whole route when real OTP is integrated.
const DEV_PASSWORD = "dev-bypass-bmes-2024";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    const digits = String(phone ?? "").replace(/\D/g, "");
    if (!digits) {
      return NextResponse.json({ error: "Phone required" }, { status: 400 });
    }

    const email = `p${digits}@dev.bmes.app`;

    // Try to create the user. If they already exist, the error is ignored
    // and the client will sign in with the same password below.
    const { data: created } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { dev_phone: digits },
    });

    if (created?.user) {
      // First login — seed the users table row
      await supabaseAdmin.from("users").insert({
        id: created.user.id,
        name: "Guest",
        email,
        phone: `+91${digits}`,
        role: "client",
        is_active: true,
      });
    }

    return NextResponse.json({ email, password: DEV_PASSWORD });
  } catch (err) {
    console.error("phone-otp-bypass error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
