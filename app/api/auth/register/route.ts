import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side admin client — never exposed to the browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password, role } = await req.json();

    // Basic server-side validation
    if (!name || !email || !password || !phone || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!["client", "artist"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Create auth user with admin — email_confirm: true skips confirmation email
    // and marks the user as already confirmed. No rate limit hit.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone, role },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // Insert into users table
    const { error: profileError } = await supabaseAdmin.from("users").insert({
      id: userId,
      name,
      email,
      phone: phone.startsWith("+91") ? phone : "+91" + phone,
      role,
      is_active: true,
    });

    if (profileError) {
      // Roll back auth user if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Failed to create profile. Please try again." }, { status: 500 });
    }

    // Create artist profile skeleton
    if (role === "artist") {
      await supabaseAdmin.from("artist_profiles").insert({
        user_id: userId,
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
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Unexpected error. Please try again." }, { status: 500 });
  }
}
