import {
  signInWithEmailAndPassword,
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
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
}

export async function clearSessionCookie() {
  await fetch("/api/auth/session", { method: "DELETE" });
}

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await syncSessionCookie(await cred.user.getIdToken());
  return cred;
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
