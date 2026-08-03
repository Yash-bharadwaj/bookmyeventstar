import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// A Firestore serverTimestamp() field reads back as null/undefined in the
// brief moment between an optimistic local write and the server's ack (e.g.
// a live onSnapshot listener rendering a just-created notification) — both
// formatters need to survive that instead of throwing "Invalid time value".
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "Just now";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Just now";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    assigned: "bg-purple-100 text-purple-700",
    requirement_gathering: "bg-yellow-100 text-yellow-700",
    shortlisting: "bg-orange-100 text-orange-700",
    proposal_sent: "bg-cyan-100 text-cyan-700",
    confirmed: "bg-green-100 text-green-700",
    in_progress: "bg-indigo-100 text-indigo-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    paid: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
    available: "bg-green-100 text-green-700",
    booked: "bg-red-100 text-red-700",
    blocked: "bg-gray-100 text-gray-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}

export function getStatusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export const EVENT_TYPES = [
  "Wedding",
  "Corporate Event",
  "Birthday Party",
  "Concert",
  "Festival",
  "Award Night",
  "Product Launch",
  "College Fest",
  "Private Party",
  "Religious Event",
  "Sports Event",
  "Other",
];

export const LANGUAGES = [
  "Hindi",
  "English",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Bhojpuri",
  "Odia",
  "Assamese",
  "Urdu",
];

export const ARTIST_CATEGORIES = [
  "Bollywood Singer",
  "Classical Singer",
  "Ghazal Singer",
  "Sufi Singer",
  "DJ",
  "Band",
  "Comedian",
  "Anchor / Emcee",
  "Dancer / Dance Troupe",
  "Magician",
  "Instrumentalist",
  "Motivational Speaker",
  "Mimicry Artist",
  "Puppeteer",
  "Folk Artist",
];

