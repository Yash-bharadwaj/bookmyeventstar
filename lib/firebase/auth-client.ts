import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithCredential,
  EmailAuthProvider,
  type ConfirmationResult,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./client";

export async function syncSessionCookie(idToken: string) {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Could not start your session — please try again.");
  }
}

export async function clearSessionCookie() {
  await fetch("/api/auth/session", { method: "DELETE" });
}

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  try {
    await syncSessionCookie(await cred.user.getIdToken());
  } catch (err) {
    // The server refused the session (e.g. account deactivated) — don't
    // leave the client half-signed-in via Firebase Auth's own persistence.
    await firebaseSignOut(auth).catch(() => {});
    throw err;
  }
  return cred;
}

/**
 * Unlike signInWithEmail, this deliberately does NOT sync the session cookie
 * itself — the caller must first check whether users/{uid} exists (a brand
 * new Google identity has no profile/role/phone yet) before deciding whether
 * it's safe to start a session. See app/login/page.tsx and
 * app/register/page.tsx for the check-then-sync flow.
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutEverywhere() {
  await clearSessionCookie();
  await firebaseSignOut(auth);
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

/** Invisible reCAPTCHA required by Firebase Phone Auth on web. Call once per page. */
export function getInvisibleRecaptcha(containerId = "recaptcha-container"): RecaptchaVerifier {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  }
  return recaptchaVerifier;
}

export function resetRecaptcha() {
  recaptchaVerifier?.clear();
  recaptchaVerifier = null;
}

/** e164Phone must be like "+919876543210". */
export async function sendPhoneOtp(e164Phone: string): Promise<ConfirmationResult> {
  const verifier = getInvisibleRecaptcha();
  return signInWithPhoneNumber(auth, e164Phone, verifier);
}

/** Attaches password-login capability to a phone-verified account (so future
 * logins don't need SMS again) using the same synthetic-email convention as
 * before. Call right after a fresh signup's OTP confirms. */
export async function linkPasswordCredential(syntheticEmail: string, password: string) {
  if (!auth.currentUser) throw new Error("No signed-in user to link a password to.");
  const credential = EmailAuthProvider.credential(syntheticEmail, password);
  await linkWithCredential(auth.currentUser, credential);
}
