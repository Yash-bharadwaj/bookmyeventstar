import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmail, notificationEmailHtml } from "@/lib/email/resend";
import { notifyUserServer } from "@/lib/notifications/server";

const MAX_ARTISTS_NOTIFIED = 12;

interface MatchableEnquiry {
  id: string;
  event_type: string;
  event_date: string;
  city: string;
  budget_max: number;
  artist_preference?: string | null;
  coordinator_id?: string | null;
}

/**
 * Notifies listed artists whose city/category/price plausibly fit a new
 * enquiry, so they can flag interest from /artist/leads. Deliberately does
 * NOT fall back to "notify everyone" when nothing matches the city (unlike
 * the coordinator's suggested-artists list) — that would mean emailing an
 * entire roster with zero relevance.
 */
export async function notifyMatchingArtistsServer(enquiry: MatchableEnquiry): Promise<number> {
  const snap = await adminDb.collection("artistProfiles").where("is_listed", "==", true).get();
  const city = enquiry.city.toLowerCase();
  const pref = enquiry.artist_preference?.toLowerCase().trim();

  let candidates = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as { id: string; cities?: string[]; categories?: string[]; base_price?: number; rating?: number })
    .filter((a) => (a.cities ?? []).some((c) => c.toLowerCase().includes(city) || city.includes(c.toLowerCase())))
    // Affordability heuristic: allow up to 20% over the client's stated max
    // — leaves room for negotiation without notifying wildly out-of-range
    // artists.
    .filter((a) => !a.base_price || a.base_price <= enquiry.budget_max * 1.2);

  if (pref) {
    const prefMatches = candidates.filter((a) =>
      (a.categories ?? []).some((c) => c.toLowerCase().includes(pref) || pref.includes(c.toLowerCase()))
    );
    if (prefMatches.length > 0) candidates = prefMatches;
  }

  candidates.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const chosen = candidates.slice(0, MAX_ARTISTS_NOTIFIED);
  if (chosen.length === 0) return 0;

  const batch = adminDb.batch();
  for (const artist of chosen) {
    const leadRef = adminDb.collection("artistLeads").doc(`${enquiry.id}_${artist.id}`);
    batch.set(leadRef, {
      enquiry_id: enquiry.id,
      artist_id: artist.id,
      event_type: enquiry.event_type,
      event_date: enquiry.event_date,
      city: enquiry.city,
      budget_max: enquiry.budget_max,
      status: "notified",
      coordinator_id: enquiry.coordinator_id ?? null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  const message = `A new ${enquiry.event_type} enquiry in ${enquiry.city} matches your profile. Let us know if you're interested — it only takes a tap.`;
  const html = notificationEmailHtml({ message, link: "/artist/leads" });
  await Promise.all(
    chosen.map(async (artist) => {
      await notifyUserServer(artist.id, {
        title: "New event lead near you",
        message,
        type: "info",
        link: "/artist/leads",
      }).catch(() => {});

      const userDoc = await adminDb.collection("users").doc(artist.id).get();
      const email = userDoc.exists ? (userDoc.data()?.email as string | undefined) : undefined;
      if (email) {
        await sendEmail({ to: email, subject: "New event lead near you", html }).catch((err) => {
          console.error(`[notifyMatchingArtistsServer] email to ${email} failed:`, err);
        });
      }
    })
  );

  return chosen.length;
}
