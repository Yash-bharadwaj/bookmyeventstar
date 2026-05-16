export type UserRole = "admin" | "coordinator" | "artist" | "client";

export type EnquiryStatus =
  | "new"
  | "assigned"
  | "requirement_gathering"
  | "shortlisting"
  | "proposal_sent"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type EnquirySource =
  | "website"
  | "whatsapp"
  | "email"
  | "instagram"
  | "referral"
  | "walk_in";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected";

export type PaymentType = "advance" | "final" | "artist_settlement";
export type PaymentStatus = "pending" | "paid" | "failed";

export type TaskType =
  | "artist_confirmation"
  | "travel_stay"
  | "technical"
  | "payment_docs"
  | "hospitality";
export type TaskStatus = "pending" | "in_progress" | "done";

export type AvailabilityStatus = "available" | "booked" | "blocked";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface ArtistProfile {
  id: string;
  user_id: string;
  bio: string;
  categories: string[];
  cities: string[];
  base_price: number;
  pricing_details: Record<string, number>;
  rating: number;
  total_bookings: number;
  is_verified: boolean;
  social_links: Record<string, string>;
  rider_notes?: string;
  user?: User;
}

export interface ArtistMedia {
  id: string;
  artist_id: string;
  type: "photo" | "video";
  url: string;
  title: string;
  is_primary: boolean;
}

export interface ArtistDocument {
  id: string;
  artist_id: string;
  type: string;
  url: string;
  is_verified: boolean;
  created_at: string;
}

export interface Availability {
  id: string;
  artist_id: string;
  date: string;
  status: AvailabilityStatus;
}

export interface Enquiry {
  id: string;
  client_id: string;
  coordinator_id?: string;
  event_type: string;
  event_date: string;
  location: string;
  city: string;
  budget_min: number;
  budget_max: number;
  artist_preference?: string;
  other_requirements?: string;
  status: EnquiryStatus;
  source: EnquirySource;
  created_at: string;
  updated_at: string;
  client?: User;
  coordinator?: User;
}

export interface ProposedArtist {
  artist_id: string;
  quoted_price: number;
  notes?: string;
  artist?: ArtistProfile & { user: User };
}

export interface Proposal {
  id: string;
  enquiry_id: string;
  coordinator_id: string;
  content: string;
  artists_proposed: ProposedArtist[];
  quoted_price: number;
  validity_date: string;
  status: ProposalStatus;
  created_at: string;
  enquiry?: Enquiry;
}

export interface Booking {
  id: string;
  enquiry_id: string;
  artist_id: string;
  coordinator_id: string;
  event_date: string;
  venue: string;
  city: string;
  advance_amount: number;
  total_amount: number;
  balance_amount: number;
  status: BookingStatus;
  special_requirements?: string;
  created_at: string;
  artist?: ArtistProfile & { user: User };
  coordinator?: User;
  enquiry?: Enquiry;
}

export interface Task {
  id: string;
  booking_id: string;
  type: TaskType;
  status: TaskStatus;
  notes?: string;
  due_date?: string;
  assigned_to?: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  type: PaymentType;
  amount: number;
  status: PaymentStatus;
  notes?: string;
  paid_at?: string;
  created_at: string;
}

export interface Feedback {
  id: string;
  booking_id: string;
  client_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export interface City {
  id: string;
  name: string;
  state: string;
}

export interface DashboardStats {
  total_enquiries: number;
  active_bookings: number;
  revenue_this_month: number;
  artists_count: number;
  pending_proposals: number;
  events_this_month: number;
}
