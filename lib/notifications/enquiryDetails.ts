import { formatCurrency, formatDate } from "@/lib/utils";
import type { EmailDetail } from "./types";

interface EnquiryForEmail {
  event_type: string;
  event_date: string;
  location: string;
  city: string;
  budget_min: number;
  budget_max: number;
  artist_preference?: string | null;
  other_requirements?: string | null;
  client?: { name?: string; phone?: string; email?: string } | null;
}

/** Full context for a coordinator's "enquiry assigned to you" email — used
 * by both assignment entry points (the enquiries list and an enquiry's own
 * detail page) so they stay in sync. */
export function enquiryAssignmentDetails(enquiry: EnquiryForEmail): EmailDetail[] {
  const details: EmailDetail[] = [
    { label: "Client", value: enquiry.client?.name || "—" },
    { label: "Phone", value: enquiry.client?.phone || "—" },
    { label: "Email", value: enquiry.client?.email || "—" },
    { label: "Event Type", value: enquiry.event_type },
    { label: "Event Date", value: formatDate(enquiry.event_date) },
    { label: "Location", value: [enquiry.location, enquiry.city].filter(Boolean).join(", ") },
    { label: "Budget", value: `${formatCurrency(enquiry.budget_min)} – ${formatCurrency(enquiry.budget_max)}` },
  ];
  if (enquiry.artist_preference) details.push({ label: "Artist Preference", value: enquiry.artist_preference });
  if (enquiry.other_requirements) details.push({ label: "Other Requirements", value: enquiry.other_requirements });
  return details;
}
