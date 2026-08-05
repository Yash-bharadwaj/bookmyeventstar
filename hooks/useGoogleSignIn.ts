"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { signInWithGoogle, syncSessionCookie, signOutEverywhere, waitForRoleClaim } from "@/lib/firebase/auth-client";
import { getBudgetBand } from "@/components/artist/BudgetRangeSelect";

type Role = "client" | "artist";

interface PendingGoogleUser {
  idToken: string;
  name: string;
  email: string;
}

/**
 * Shared "Continue with Google" flow for both /login and /register.
 *
 * The one rule this enforces everywhere: after the Google popup resolves,
 * always check users/{uid} before doing anything else. If it exists, this
 * is a returning user — log them straight into their real dashboard
 * regardless of which page/tab the button was clicked from. If it doesn't,
 * this is a brand-new signup — surface an inline "just need a couple more
 * things" step on the SAME page (never redirect away, which would lose the
 * freshly-authenticated Firebase session) asking only for what's genuinely
 * missing: phone always, and role too if the caller didn't already fix one
 * (register's per-tab forms know their role already; login doesn't).
 *
 * Phone is collected as plain text, not SMS-verified — Google's own email
 * is already a verified identity, and Firebase Phone Auth's SMS delivery to
 * Indian numbers is unreliable (carrier DLT-template filtering silently
 * drops most of it, independent of Firebase billing/quota). Uniqueness
 * across accounts is enforced server-side instead (see /api/auth/google's
 * Firestore lookup on the raw phone value).
 */
export function useGoogleSignIn(fixedRole?: Role, redirectTo?: string | null) {
  const router = useRouter();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleUser, setGoogleUser] = useState<PendingGoogleUser | null>(null);
  const [pendingRole, setPendingRole] = useState<Role | undefined>(fixedRole);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [finishing, setFinishing] = useState(false);

  const startGoogleSignIn = async () => {
    setGoogleBusy(true);
    try {
      const cred = await signInWithGoogle();
      const snap = await getDoc(doc(db, "users", cred.user.uid));

      if (snap.exists()) {
        const role = (snap.data().role as string) ?? "client";
        // Force a refresh, not the token signInWithPopup just handed back —
        // if this browser already had a live session for this uid from
        // BEFORE the role custom claim was set server-side (e.g. an earlier
        // incomplete signup attempt), the SDK can still be holding that
        // older token. The session cookie's role comes from this token's
        // claims (middleware verifies it at the Edge, can't hit Firestore),
        // while server components read the role straight from Firestore —
        // a stale claim here desyncs the two and produces an infinite
        // /login redirect loop (ERR_TOO_MANY_REDIRECTS).
        const idToken = await cred.user.getIdToken(true);
        await syncSessionCookie(idToken);
        toast.success("Welcome back!");
        router.push(redirectTo ?? `/${role}`);
        router.refresh();
        return;
      }

      const idToken = await cred.user.getIdToken();
      setGoogleUser({ idToken, name: cred.user.displayName ?? "", email: cred.user.email ?? "" });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // User closed the popup themselves — not an error worth surfacing.
      } else if (code === "auth/popup-blocked") {
        toast.error("Your browser blocked the Google sign-in popup. Please allow popups and try again.");
      } else if (code === "auth/account-exists-with-different-credential") {
        toast.error("This email already has an account. Please log in with your password instead.");
      } else {
        console.error("[google-signin] failed:", err);
        toast.error("Something went wrong signing in with Google. Please try again.");
      }
    } finally {
      setGoogleBusy(false);
    }
  };

  const cancelGoogleSignup = async () => {
    setGoogleUser(null);
    setPhoneDigits("");
    // They started a Google sign-in but backed out before finishing setup —
    // don't leave Firebase Auth's own persistence signed in to a Google
    // identity with no profile behind it.
    await signOutEverywhere().catch(() => {});
  };

  const finishGoogleSignup = async () => {
    if (!googleUser) return;
    const digits = phoneDigits.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    if (!pendingRole) { toast.error("Please choose an account type"); return; }
    if (pendingRole === "artist") {
      if (categories.length === 0) { toast.error("Select what kind of artist you are"); return; }
      if (!city) { toast.error("Select your city"); return; }
      if (!area.trim()) { toast.error("Enter your area / locality"); return; }
      if (!budgetRange) { toast.error("Select your starting price range"); return; }
    }
    const band = pendingRole === "artist" ? getBudgetBand(budgetRange) : undefined;

    setFinishing(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: googleUser.idToken,
          phone: digits,
          role: pendingRole,
          categories,
          city,
          area: area.trim(),
          budgetMin: band?.min,
          budgetMax: band?.max,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast.error(json.error ?? "This mobile number is already registered — please log in instead.");
          await signOutEverywhere().catch(() => {});
          setGoogleUser(null);
          router.push("/login");
          return;
        }
        toast.error(json.error ?? "Could not finish setting up your account.");
        return;
      }

      // The ID token we've been holding was minted before the server just
      // set the role custom claim. A single forced refresh narrows that gap
      // but doesn't close it — Identity Platform's custom-claims propagation
      // to the token-minting backend isn't guaranteed to have landed by the
      // very next refresh, so retry until the claim actually shows up (see
      // waitForRoleClaim in auth-client.ts). Otherwise role-gated redirects
      // could sync a stale/wrong-role session cookie and desync middleware's
      // claim-based role check from Firestore's, producing a redirect loop.
      if (auth.currentUser) {
        const freshToken = await waitForRoleClaim(auth.currentUser, pendingRole);
        await syncSessionCookie(freshToken);
      }

      toast.success("Account created! Welcome to BookMyEventStar.");
      router.push(redirectTo ?? `/${pendingRole}`);
      router.refresh();
    } catch (err) {
      console.error("[google-signin] finish failed:", err);
      toast.error("Something went wrong — please try again.");
    } finally {
      setFinishing(false);
    }
  };

  return {
    googleBusy,
    googleUser,
    pendingRole,
    setPendingRole,
    phoneDigits,
    setPhoneDigits,
    categories,
    setCategories,
    city,
    setCity,
    area,
    setArea,
    budgetRange,
    setBudgetRange,
    finishing,
    startGoogleSignIn,
    finishGoogleSignup,
    cancelGoogleSignup,
  };
}
