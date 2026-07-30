"use client";

import { useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { syncSessionCookie } from "@/lib/firebase/auth-client";
import { useAuthStore } from "@/store/auth";
import type { User } from "@/types";

export function useUser() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Fires on sign-in and Firebase's automatic ~hourly token refresh — keeps
    // the httpOnly session cookie middleware reads in sync with the client
    // SDK's own session state. Deliberately does NOT clear the cookie when
    // `fbUser` is null: the client SDK can report "no user" for a browser
    // that still holds a perfectly valid session cookie (private browsing,
    // storage partitioning, or just a tab that hasn't restored persisted
    // auth yet) — wiping the cookie here would forcibly sign out someone
    // who's actually still logged in. The middleware independently verifies
    // the cookie's JWT on every request, so an actually-expired/invalid
    // session is still caught there; explicit sign-out already goes through
    // signOutEverywhere(), which clears the cookie directly.
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      if (fbUser) {
        const idToken = await fbUser.getIdToken();
        await syncSessionCookie(idToken);
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        setUser(snap.exists() ? ({ id: fbUser.uid, ...snap.data() } as User) : null);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return { user, isLoading };
}
