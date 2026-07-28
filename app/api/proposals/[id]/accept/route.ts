import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";
import { notifyUserServer, emailUserServer } from "@/lib/notifications/server";

/**
 * Client-driven proposal acceptance. firestore.rules only allows a
 * `bookings/{id}` create from a coordinator/admin, so the auto-drafted
 * booking that should follow an accept can't be written from the client SDK
 * — this route is the server-mediated equivalent (Admin SDK bypasses rules),
 * mirroring the artist-side booking-update route.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const proposalRef = adminDb.collection("proposals").doc(params.id);
  const proposalSnap = await proposalRef.get();
  if (!proposalSnap.exists) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  const proposal = proposalSnap.data()!;

  const enquiryRef = adminDb.collection("enquiries").doc(proposal.enquiry_id);
  const enquirySnap = await enquiryRef.get();
  if (!enquirySnap.exists) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  const enquiry = enquirySnap.data()!;

  if (enquiry.client_id !== decoded.uid) {
    return NextResponse.json({ error: "You do not own this proposal" }, { status: 403 });
  }
  if (proposal.status !== "sent") {
    return NextResponse.json({ error: "Proposal is no longer pending" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const preferredArtistId: string | null =
    typeof body.preferredArtistId === "string" && body.preferredArtistId ? body.preferredArtistId : null;
  const artists: any[] = proposal.artists_proposed ?? [];
  const preferredName = artists.find((a) => a.artist_id === preferredArtistId)?.name;

  try {
    await proposalRef.update({
      status: "accepted",
      client_chosen_artist_id: preferredArtistId,
      updated_at: FieldValue.serverTimestamp(),
    });
    await enquiryRef.update({ status: "confirmed", updated_at: FieldValue.serverTimestamp() });

    // Only auto-draft a booking when the artist is unambiguous (client
    // picked one, or only one was ever proposed) — venue/amounts start from
    // the enquiry's own details and the coordinator confirms them
    // afterwards; the artist isn't notified until that confirmation.
    const bookingArtistId = preferredArtistId || (artists.length === 1 ? artists[0].artist_id : null);
    const bookingArtist = artists.find((a) => a.artist_id === bookingArtistId);
    let bookingCreated = false;
    let hasConflict = false;

    if (bookingArtistId) {
      // This runs with no coordinator in the loop yet, so unlike the
      // coordinator's own manual createBooking flow, there's no one to
      // notice an "already booked" warning badge — check for a genuine
      // conflict here and skip the auto-draft entirely rather than risk
      // silently double-booking the artist.
      const [availSnap, conflictSnap] = await Promise.all([
        adminDb.collection("artistProfiles").doc(bookingArtistId).collection("availability").doc(enquiry.event_date).get(),
        adminDb.collection("bookings")
          .where("artist_id", "==", bookingArtistId)
          .where("event_date", "==", enquiry.event_date)
          .get(),
      ]);
      hasConflict =
        (availSnap.exists && availSnap.data()?.status === "blocked") ||
        conflictSnap.docs.some((d) => d.data().status !== "cancelled");
    }

    if (bookingArtistId && !hasConflict) {
      const totalAmt = bookingArtist?.quoted_price ?? proposal.quoted_price;
      const advanceAmt = Math.round(totalAmt * 0.3);
      const bookingRef = adminDb.collection("bookings").doc();
      const batch = adminDb.batch();
      batch.set(bookingRef, {
        proposal_id: params.id,
        enquiry_id: proposal.enquiry_id,
        coordinator_id: proposal.coordinator_id ?? null,
        artist_id: bookingArtistId,
        event_date: enquiry.event_date,
        venue: enquiry.location ?? "",
        city: enquiry.city,
        total_amount: totalAmt,
        advance_amount: advanceAmt,
        balance_amount: totalAmt - advanceAmt,
        status: "pending",
        auto_created: true,
        special_requirements: enquiry.other_requirements ?? null,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      const taskTypes = ["artist_confirmation", "travel_stay", "technical", "payment_docs", "hospitality"] as const;
      taskTypes.forEach((type) => {
        const taskRef = bookingRef.collection("tasks").doc();
        batch.set(taskRef, {
          type, status: "pending", notes: "", due_date: null, assigned_to: null,
          created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      bookingCreated = true;
    }

    if (proposal.coordinator_id) {
      const payload = bookingCreated
        ? {
            title: "🎉 Proposal Accepted — Confirm Booking",
            message: `${enquiry.event_type ?? "Event"} booking draft created${preferredName ? ` for ${preferredName}` : ""}. Please confirm the venue and payment split.`,
            link: `/coordinator/proposals`,
          }
        : hasConflict
        ? {
            title: "⚠️ Proposal Accepted — Artist Unavailable",
            message: `${enquiry.event_type ?? "Event"} was accepted${preferredName ? ` for ${preferredName}` : ""}, but they're already booked or blocked on ${enquiry.event_date}. Please resolve this with the artist or client before creating the booking.`,
            link: `/coordinator/proposals`,
          }
        : {
            title: "🎉 Proposal Accepted — Create Booking",
            message: `${enquiry.event_type ?? "Event"} booking confirmed${preferredName ? `. Client prefers ${preferredName}` : ""}. Multiple artist options were proposed — please pick one and create the booking.`,
            link: `/coordinator/proposals`,
          };
      await notifyUserServer(proposal.coordinator_id, { ...payload, type: hasConflict ? "warning" : "success" });
      await emailUserServer(proposal.coordinator_id, payload);
    }

    return NextResponse.json({ success: true, bookingCreated });
  } catch (err) {
    console.error("[proposals/accept] failed:", err);
    return NextResponse.json({ error: "Failed to accept proposal" }, { status: 500 });
  }
}
