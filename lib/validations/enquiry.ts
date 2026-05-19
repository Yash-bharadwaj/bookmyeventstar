import { z } from "zod";

const sourceEnum = z.enum([
  "website",
  "whatsapp",
  "email",
  "instagram",
  "referral",
  "walk_in",
]);

export const submitterTypeSchema = z.enum(["personal", "company", "planner"]);

/** Parse number from controlled inputs (string | number from react-hook-form). */
function budgetNumber(min: number, label: string) {
  return z
    .union([z.string(), z.number()])
    .transform((v) => {
      if (typeof v === "number") return v;
      const t = v.trim();
      if (t === "") return NaN;
      return Number(t);
    })
    .refine((n) => Number.isFinite(n) && n >= min, { message: label });
}

function budgetNumberOptional() {
  return z
    .union([z.string(), z.number(), z.undefined()])
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === "number") return v <= 0 ? undefined : v;
      const t = v.trim();
      if (t === "") return undefined;
      const n = Number(t);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    });
}

/** Client enquiry after mobile OTP (phone comes from auth, not the form). */
export const enquiryFormSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    submitter_type: submitterTypeSchema,
    event_type: z.string().min(1, "Please select an event type"),
    event_date: z.string().min(1, "Event date is required"),
    location: z.string().min(3, "Location is required"),
    city: z.string().min(1, "City is required"),
    budget_min: budgetNumber(5000, "Minimum budget is ₹5,000"),
    budget_max: budgetNumberOptional(),
    artist_preference: z.string().optional(),
    other_requirements: z.string().optional(),
    source: sourceEnum,
  })
  .refine(
    (d) => d.budget_max == null || d.budget_max === 0 || d.budget_max >= d.budget_min,
    { message: "Maximum must be greater than or equal to minimum", path: ["budget_max"] }
  );

/** RHF field values (before transform). */
export type EnquiryFormValues = z.input<typeof enquiryFormSchema>;
/** Parsed payload after validation (use in onSubmit). */
export type EnquiryFormData = z.output<typeof enquiryFormSchema>;

/** Legacy schema (e.g. embedded artist quick enquiry). */
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
  source: sourceEnum,
});
