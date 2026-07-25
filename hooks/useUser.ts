"use client";

import { useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { syncSessionCookie, clearSessionCookie } from "@/lib/firebase/auth-client";
import { useAuthStore } from "@/store/auth";
import type { User } from "@/types";

export function useUser() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Fires on sign-in, sign-out, and Firebase's automatic ~hourly token
    // refresh — keeps the httpOnly session cookie middleware reads in sync
    // with the client SDK's own session state.
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      if (fbUser) {
        const idToken = await fbUser.getIdToken();
        await syncSessionCookie(idToken);
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        setUser(snap.exists() ? ({ id: fbUser.uid, ...snap.data() } as User) : null);
      } else {
        await clearSessionCookie();
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return { user, isLoading };
}
