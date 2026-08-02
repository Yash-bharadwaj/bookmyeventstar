"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { doc, getDoc } from "firebase/firestore";
import type { ConfirmationResult } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import {
  signInWithGoogle, syncSessionCookie, signOutEverywhere,
  linkPhoneToCurrentUser, resetRecaptcha,
} from "@/lib/firebase/auth-client";
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
 * missing: a *verified* phone number always, and role too if the caller
 * didn't already fix one (register's per-tab forms know their role
 * already; login doesn't).
 *
 * Phone gets verified via SMS OTP linked onto the already-signed-in Google
 * account (linkPhoneToCurrentUser) rather than typed in as free text — this
 * is also what gives phone-number uniqueness across accounts, since Firebase
 * itself rejects linking a phone number that's already linked elsewhere.
 * The page using this hook needs a `<div id="recaptcha-container" />`
 * somewhere in its tree.
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

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

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

  const resetPhoneOtpState = () => {
    setOtpSent(false);
    setOtpCode("");
    setPhoneVerified(false);
    setConfirmationResult(null);
  };

  const cancelGoogleSignup = async () => {
    setGoogleUser(null);
    setPhoneDigits("");
    resetPhoneOtpState();
    // They started a Google sign-in but backed out before finishing setup —
    // don't leave Firebase Auth's own persistence signed in to a Google
    // identity with no profile behind it.
    await signOutEverywhere().catch(() => {});
  };

  /** Lets them fix a mistyped number after "Send code" — without this
   * there's no way back once otpSent locks the input. Only meaningful
   * before verification; the current confirmationResult is for the old
   * (wrong) number, so it's cleared along with everything else. */
  const editPhoneNumber = () => {
    setOtpSent(false);
    setOtpCode("");
    setConfirmationResult(null);
  };

  const handleSendPhoneOtp = async () => {
    const digits = phoneDigits.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    setOtpBusy(true);
    try {
      const result = await linkPhoneToCurrentUser(`+91${digits}`);
      setConfirmationResult(result);
      setOtpSent(true);
      setResendIn(45);
      toast.success("Code sent to your mobile");
    } catch (err) {
      console.error("[google-signin] phone-otp send failed:", err);
      resetRecaptcha();
      toast.error("Could not send the code — please try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyPhoneOtp = async (codeOverride?: string) => {
    const code = (codeOverride ?? otpCode).trim();
    if (!confirmationResult || code.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setOtpBusy(true);
    try {
      await confirmationResult.confirm(code);
      setPhoneVerified(true);
      toast.success("Mobile number verified");
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code ?? "";
      if (errCode === "auth/credential-already-in-use" || errCode === "auth/account-exists-with-different-credential") {
        // Don't sign them out of the Google session they just legitimately
        // completed — this is very plausibly just a mistyped digit landing
        // on someone else's real number, not necessarily "this is you,
        // logged in elsewhere." Let them fix it and retry; "Use a different
        // sign-in method" below is still there if it really is their number.
        toast.error("That mobile number is already registered to a different account. Check the number and try again, or use a different sign-in method to log in.");
        setOtpError(true);
        setTimeout(() => setOtpError(false), 500);
        editPhoneNumber();
        return;
      }
      console.error("[google-signin] phone-otp verify failed:", err);
      toast.error("Incorrect code — please try again.");
      setOtpError(true);
      setOtpCode("");
      setTimeout(() => setOtpError(false), 500);
    } finally {
      setOtpBusy(false);
    }
  };

  const finishGoogleSignup = async () => {
    if (!googleUser) return;
    if (!phoneVerified) { toast.error("Please verify your mobile number first"); return; }
    if (!pendingRole) { toast.error("Please choose an account type"); return; }
    if (pendingRole === "artist") {
      if (!category) { toast.error("Select what kind of artist you are"); return; }
      if (!city) { toast.error("Select your city"); return; }
      if (!area.trim()) { toast.error("Enter your area / locality"); return; }
      if (!budgetRange) { toast.error("Select your starting price range"); return; }
    }
    const band = pendingRole === "artist" ? getBudgetBand(budgetRange) : undefined;
    const digits = phoneDigits.replace(/\D/g, "").slice(-10);

    setFinishing(true);
    try {
      // Force a refresh — the token we've held since the popup resolved
      // predates the phone link, so it wouldn't carry the phone_number claim
      // the server checks against.
      const freshToken = await auth.currentUser?.getIdToken(true);
      if (!freshToken) { toast.error("Your session expired — please sign in again."); return; }

      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: freshToken,
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

      // The role custom claim was just set server-side — refresh again so
      // the session cookie carries it, otherwise role-gated redirects would
      // treat a new artist as a client.
      const roleToken = await auth.currentUser?.getIdToken(true);
      if (roleToken) await syncSessionCookie(roleToken);

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
    otpSent,
    otpCode,
    setOtpCode,
    otpBusy,
    otpError,
    resendIn,
    phoneVerified,
    handleSendPhoneOtp,
    handleVerifyPhoneOtp,
    editPhoneNumber,
  };
}
