"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { signInWithGoogle, syncSessionCookie, signOutEverywhere } from "@/lib/firebase/auth-client";
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
 */
export function useGoogleSignIn(fixedRole?: Role, redirectTo?: string | null) {
  const router = useRouter();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleUser, setGoogleUser] = useState<PendingGoogleUser | null>(null);
  const [pendingRole, setPendingRole] = useState<Role | undefined>(fixedRole);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [finishing, setFinishing] = useState(false);

  const startGoogleSignIn = async () => {
    setGoogleBusy(true);
    try {
      const cred = await signInWithGoogle();
      const idToken = await cred.user.getIdToken();
      const snap = await getDoc(doc(db, "users", cred.user.uid));

      if (snap.exists()) {
        const role = (snap.data().role as string) ?? "client";
        await syncSessionCookie(idToken);
        toast.success("Welcome back!");
        router.push(redirectTo ?? `/${role}`);
        router.refresh();
        return;
      }

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
    const digits = phoneDigits.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(digits)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    if (!pendingRole) { toast.error("Please choose an account type"); return; }
    if (pendingRole === "artist") {
      if (!category) { toast.error("Select what kind of artist you are"); return; }
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
          category,
          city,
          area: area.trim(),
          budgetMin: band?.min,
          budgetMax: band?.max,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Could not finish setting up your account."); return; }

      // The ID token we've been holding was minted before the server just
      // set the role custom claim — force a refresh so the token (and the
      // session cookie built from it) actually carries the new role,
      // otherwise role-gated redirects would treat a new artist as a client.
      const freshToken = await auth.currentUser?.getIdToken(true);
      if (freshToken) await syncSessionCookie(freshToken);

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
    category,
    setCategory,
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
