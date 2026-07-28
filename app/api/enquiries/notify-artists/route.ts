import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { notifyMatchingArtistsServer } from "@/lib/notifications/artistLeads";

/**
 * Notifies artists who plausibly match a newly-created enquiry (city,
 * category, budget) so they can flag interest from /artist/leads.
 *
 * Intentionally unauthenticated (called right after a brand-new client
 * finishes account setup + enquiry submission on the public /enquiry page) —
 * re-fetches the enquiry itself via the Admin SDK rather than trusting any
 * client-sent city/budget, so a caller can't spoof which artists get pinged.
 */
export async function POST(req: NextRequest) {
  try {
    const { enquiry_id } = await req.json();
    if (typeof enquiry_id !== "string" || !enquiry_id.trim()) {
      return NextResponse.json({ error: "enquiry_id is required" }, { status: 400 });
    }

    const doc = await adminDb.collection("enquiries").doc(enquiry_id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }

    const data = doc.data()!;
    const notified = await notifyMatchingArtistsServer({
      id: doc.id,
      event_type: data.event_type,
      event_date: data.event_date,
      city: data.city,
      budget_max: data.budget_max,
      artist_preference: data.artist_preference ?? null,
      coordinator_id: data.coordinator_id ?? null,
    });

    return NextResponse.json({ success: true, notified });
  } catch (err) {
    console.error("[notify-artists] failed:", err);
    return NextResponse.json({ error: "Failed to notify artists" }, { status: 500 });
  }
}
