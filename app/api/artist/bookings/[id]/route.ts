import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";

/**
 * Artist-driven booking updates (accept/decline a request, submit performance
 * requirements).
 *
 * firestore.rules only allows a `bookings/{id}` write from a coordinator/admin
 * or the enquiry's owning client — an artist has no direct client-side write
 * path to their own booking's `status`/`special_requirements`. This route is
 * the server-mediated equivalent (Admin SDK bypasses rules), and also handles
 * notifying the coordinator so the artist never needs to read the booking
 * back via the client SDK just to find the coordinator_id.
 */
async function requireArtist(bookingId: string): Promise<{ uid: string } | { error: string; status: number }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return { error: "Not signed in", status: 401 };
  const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
  if (!decoded) return { error: "Not signed in", status: 401 };

  const bookingSnap = await adminDb.collection("bookings").doc(bookingId).get();
  if (!bookingSnap.exists) return { error: "Booking not found", status: 404 };
  if (bookingSnap.data()?.artist_id !== decoded.uid) {
    return { error: "You do not own this booking", status: 403 };
  }
  return { uid: decoded.uid };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireArtist(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const update: Record<string, unknown> = {};
  let notifyStatus: "confirmed" | "cancelled" | null = null;

  if (body.status === "confirmed" || body.status === "cancelled") {
    update.status = body.status;
    notifyStatus = body.status;
  }
  if (typeof body.cancellation_reason === "string") update.cancellation_reason = body.cancellation_reason;
  if (typeof body.special_requirements === "string") update.special_requirements = body.special_requirements;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  update.updated_at = FieldValue.serverTimestamp();

  try {
    const bookingRef = adminDb.collection("bookings").doc(params.id);
    await bookingRef.update(update);

    if (notifyStatus) {
      const bookingSnap = await bookingRef.get();
      const booking = bookingSnap.data();
      const coordinatorId = booking?.coordinator_id as string | undefined;
      if (coordinatorId) {
        let eventType = "event";
        if (booking?.enquiry_id) {
          const enquirySnap = await adminDb.collection("enquiries").doc(booking.enquiry_id).get();
          eventType = enquirySnap.data()?.event_type ?? "event";
        }
        const reason = typeof body.cancellation_reason === "string" ? body.cancellation_reason : undefined;
        await adminDb.collection("users").doc(coordinatorId).collection("notifications").add({
          title: notifyStatus === "confirmed" ? "Artist Confirmed Booking" : "Artist Declined Booking",
          message: `Artist has ${notifyStatus === "confirmed" ? "accepted" : "declined"} the booking for ${eventType}${reason ? `: "${reason}"` : ""}. ${notifyStatus === "cancelled" ? "Please propose a replacement artist." : ""}`,
          type: notifyStatus === "confirmed" ? "success" : "warning",
          is_read: false,
          link: "/coordinator/bookings",
          created_at: FieldValue.serverTimestamp(),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[artist/bookings PATCH] failed:", err);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
