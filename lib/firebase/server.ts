import { cache } from "react";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "./admin";
import { SESSION_COOKIE_NAME } from "./session";
import type { User } from "@/types";

/**
 * Server-component equivalent of today's `supabase.auth.getUser()` + profile lookup.
 * Wrapped in React's cache() so the role layout.tsx and its page.tsx can both
 * call this within one request without doubling the Firestore read.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const snap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!snap.exists) return null;
    return { id: decoded.uid, ...(snap.data() as Omit<User, "id">) };
  } catch {
    return null;
  }
});
