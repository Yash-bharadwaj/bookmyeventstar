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

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
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

export const INDIA_CITIES = [
  { name: "Mumbai", state: "Maharashtra" },
  { name: "Delhi", state: "Delhi" },
  { name: "Bengaluru", state: "Karnataka" },
  { name: "Hyderabad", state: "Telangana" },
  { name: "Chennai", state: "Tamil Nadu" },
  { name: "Kolkata", state: "West Bengal" },
  { name: "Pune", state: "Maharashtra" },
  { name: "Ahmedabad", state: "Gujarat" },
  { name: "Jaipur", state: "Rajasthan" },
  { name: "Surat", state: "Gujarat" },
  { name: "Lucknow", state: "Uttar Pradesh" },
  { name: "Chandigarh", state: "Punjab" },
  { name: "Kochi", state: "Kerala" },
  { name: "Indore", state: "Madhya Pradesh" },
  { name: "Bhopal", state: "Madhya Pradesh" },
  { name: "Nagpur", state: "Maharashtra" },
  { name: "Visakhapatnam", state: "Andhra Pradesh" },
  { name: "Coimbatore", state: "Tamil Nadu" },
  { name: "Gurgaon", state: "Haryana" },
  { name: "Noida", state: "Uttar Pradesh" },
];
