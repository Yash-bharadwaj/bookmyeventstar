"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

/**
 * Shared quick-enquiry logic for anywhere a client can book one specific
 * artist directly (the /artists directory drawer, and the standalone
 * /artists/{slug} profile page) — extracted so both surfaces create the
 * exact same enquiry doc + admin notification without duplicating that
 * Firestore logic, while leaving each surface's own layout/JSX independent.
 */
export const quickEnquirySchema = z.object({
  name: z.string().min(2, "Enter your name"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Valid 10-digit mobile number"),
  email: z.string().email("Valid email required"),
  event_type: z.string().min(1, "Select event type"),
  event_date: z.string().min(1, "Select event date"),
  city: z.string().min(1, "Select city"),
  message: z.string().optional(),
});
export type QuickEnquiryForm = z.infer<typeof quickEnquirySchema>;

interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export function useQuickEnquiry(artist: { user: { name: string } }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<QuickEnquiryForm>({
    resolver: zodResolver(quickEnquirySchema),
  });

  // Pre-fill from session on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) return;
      const snap = await getDoc(doc(db, "users", fbUser.uid));
      if (!snap.exists()) return;
      const profile = snap.data();
      const digits = (profile.phone ?? "").replace(/\D/g, "").slice(-10);
      setSessionUser({ id: fbUser.uid, name: profile.name ?? "", email: profile.email ?? "", phone: digits });
      if (profile.name) setValue("name", profile.name);
      if (profile.email) setValue("email", profile.email);
      if (digits) setValue("phone", digits);
    });
    return () => unsubscribe();
  }, [setValue]);

  const onSubmit = async (data: QuickEnquiryForm) => {
    setLoading(true);
    try {
      // Require login — redirect to enquiry page for unauthenticated users
      const fbUser = auth.currentUser;
      if (!fbUser) {
        toast("Please verify your mobile first to send an enquiry.", { icon: "ℹ️" });
        window.location.href = `/enquiry`;
        return;
      }

      await addDoc(collection(db, "enquiries"), {
        client_id: fbUser.uid,
        event_type: data.event_type,
        event_date: data.event_date,
        location: data.city,
        city: data.city,
        budget_min: 50000,
        budget_max: 500000,
        artist_preference: artist.user.name,
        other_requirements: data.message || null,
        status: "new",
        source: "website",
        submitter_type: "personal",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      // Notify all admins — non-fatal. Done via a server route (Admin SDK)
      // because firestore.rules doesn't let a client-role user list the
      // `users` collection by role, so this can't be a direct client query.
      fetch("/api/notify-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Enquiry Received",
          message: `${data.name} wants to book ${artist.user.name} for ${data.event_type} in ${data.city}.`,
          type: "info",
        }),
      }).catch(() => {});

      setSubmitted(true);
      toast.success("Enquiry submitted! We'll call you within 2 hours.", { duration: 5000 });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return {
    submitted,
    loading,
    sessionUser,
    register,
    handleSubmit,
    setValue,
    watch,
    errors,
    onSubmit,
  };
}
