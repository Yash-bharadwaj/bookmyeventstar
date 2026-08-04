import { z } from "zod";

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Enter your email or mobile number")
    .refine(
      (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^[6-9]\d{9}$/.test(v.replace(/\D/g, "")),
      "Enter a valid email address or 10-digit mobile number"
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    role: z.enum(["client", "artist"]),
    categories: z.array(z.string()).optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    area: z.string().optional(),
    budgetRange: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    if (data.role !== "artist") return;
    if (!data.categories || data.categories.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select what kind of artist you are", path: ["categories"] });
    }
    if (!data.state?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select your state", path: ["state"] });
    }
    if (!data.city?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select your city", path: ["city"] });
    }
    if (!data.area?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter your area / locality", path: ["area"] });
    }
    if (!data.budgetRange?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select your starting price range", path: ["budgetRange"] });
    }
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
