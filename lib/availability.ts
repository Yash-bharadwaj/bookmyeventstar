import { db } from "@/lib/firebase/client";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

export type AvailabilityStatus = "available" | "blocked" | "booked";

/**
 * Checks whether an artist is free on a given date, combining two sources:
 * the artist's own calendar (`artistProfiles/{id}/availability/{date}`,
 * status "blocked") and any non-cancelled booking already on the books for
 * that date. Either one marks the artist unavailable.
 */
export async function checkArtistAvailability(
  artistId: string,
  dateStr: string,
  /** Exclude this booking doc from the conflict check — needed when
   * re-verifying availability for a booking that's already being
   * edited/confirmed (e.g. an auto-drafted booking), which would otherwise
   * show up as a false-positive conflict against itself. */
  excludeBookingId?: string
): Promise<AvailabilityStatus> {
  const availSnap = await getDoc(doc(db, "artistProfiles", artistId, "availability", dateStr));
  if (availSnap.exists() && availSnap.data().status === "blocked") return "blocked";

  const bookingsSnap = await getDocs(
    query(
      collection(db, "bookings"),
      where("artist_id", "==", artistId),
      where("event_date", "==", dateStr)
    )
  );
  if (bookingsSnap.docs.some((d) => d.id !== excludeBookingId && d.data().status !== "cancelled")) return "booked";

  return "available";
}

/** Batch version — resolves availability for many artists on the same date in parallel. */
export async function checkArtistsAvailability(
  artistIds: string[],
  dateStr: string
): Promise<Record<string, AvailabilityStatus>> {
  const entries = await Promise.all(
    artistIds.map(async (id) => [id, await checkArtistAvailability(id, dateStr)] as const)
  );
  return Object.fromEntries(entries);
}
