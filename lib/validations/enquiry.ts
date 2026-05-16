import { z } from "zod";

export const enquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  event_type: z.string().min(1, "Please select an event type"),
  event_date: z.string().min(1, "Event date is required"),
  location: z.string().min(3, "Location is required"),
  city: z.string().min(1, "City is required"),
  budget_min: z.number().min(5000, "Minimum budget is ₹5,000"),
  budget_max: z.number(),
  artist_preference: z.string().optional(),
  other_requirements: z.string().optional(),
  source: z.enum([
    "website",
    "whatsapp",
    "email",
    "instagram",
    "referral",
    "walk_in",
  ]),
});

export type EnquiryFormData = z.infer<typeof enquirySchema>;
