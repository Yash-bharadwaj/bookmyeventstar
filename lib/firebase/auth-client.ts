import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  linkWithCredential,
  EmailAuthProvider,
  type ConfirmationResult,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./client";

/**
 * Waits for `user`'s ID token to actually carry `expectedRole` before
 * returning it. `setCustomUserClaims` on the server and this client-side
 * token fetch are two independent round-trips to Firebase/GCP's backend —
 * even a forced refresh immediately after the claim-setting call can, in
 * practice, still land on a token minted from a backend replica that hasn't
 * ingested the new claim yet (a real, documented eventual-consistency gap in
 * Identity Platform's custom-claims propagation, not just local SDK
 * caching). A single `getIdToken(true)` therefore only reduces the odds of
 * that race, not eliminates it — which is what previously made "sign up as
 * artist" intermittently sync a claim-less/wrong-role session cookie,
 * causing middleware's claim-based role check to disagree with the
 * Firestore-based one server components use and produce an infinite
 * /login<->/{role} redirect loop. Retrying a bounded number of times closes
 * the gap instead of merely narrowing it.
 */
export async function waitForRoleClaim(
  user: { getIdTokenResult: (forceRefresh?: boolean) => Promise<{ token: string; claims: Record<string, unknown> }> },
  expectedRole: string,
  maxAttempts = 6,
  delayMs = 350
): Promise<string> {
  let lastToken = "";
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await user.getIdTokenResult(true);
    lastToken = result.token;
    if (result.claims.role === expectedRole) return lastToken;
    if (attempt < maxAttempts - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  console.error(`[auth] role claim never became "${expectedRole}" after ${maxAttempts} attempts — session cookie may sync with a stale role.`);
  return lastToken;
}

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

/**
 * `expectedRole` should be passed right after registration (this account's
 * role claim was just set moments ago server-side) — see waitForRoleClaim
 * above for why a single forced refresh isn't reliable enough there. Omit it
 * for a plain login, where the role isn't changing and any valid token is
 * already correct.
 */
export async function signInWithEmail(email: string, password: string, expectedRole?: string): Promise<UserCredential> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  try {
    const idToken = expectedRole
      ? await waitForRoleClaim(cred.user, expectedRole)
      : await cred.user.getIdToken(true);
    await syncSessionCookie(idToken);
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
  try {
    recaptchaVerifier?.clear();
  } catch {
    // The verifier's container may already be gone (e.g. the page that
    // created it was navigated away from) or the widget already used up —
    // either way the goal here is just to drop the stale reference below,
    // so a throw from clear() itself must never propagate.
  }
  recaptchaVerifier = null;
}

/** e164Phone must be like "+919876543210". Always starts from a fresh
 * verifier — Firebase's invisible reCAPTCHA is single-use, and the module-
 * level verifier can otherwise go stale across a client-side route change
 * (it stays bound to the #recaptcha-container div of whichever page created
 * it, which may no longer be mounted). Reusing a stale/spent verifier is
 * what produces the opaque "could not send code" failure on a second
 * attempt. */
export async function sendPhoneOtp(e164Phone: string): Promise<ConfirmationResult> {
  resetRecaptcha();
  const verifier = getInvisibleRecaptcha();
  return signInWithPhoneNumber(auth, e164Phone, verifier);
}

/** Same as sendPhoneOtp, but for a user who's already signed in (Google
 * sign-up finishing their profile) — verifies + links the phone number onto
 * the CURRENT account instead of signing into/creating a different one.
 * Firebase itself rejects the link with `auth/credential-already-in-use` (at
 * confirm() time) if that phone number is already linked to a different
 * account, which is what gives phone-number uniqueness across accounts. */
export async function linkPhoneToCurrentUser(e164Phone: string): Promise<ConfirmationResult> {
  if (!auth.currentUser) throw new Error("No signed-in user to link a phone number to.");
  resetRecaptcha();
  const verifier = getInvisibleRecaptcha();
  return linkWithPhoneNumber(auth.currentUser, e164Phone, verifier);
}

/** Maps a phone-OTP send failure to a message that actually tells the user
 * (or whoever's debugging with them) what to do next — the generic "please
 * try again" that used to cover every case looks identical whether it's a
 * typo, a Firebase abuse-rate-limit, or a real outage, which makes a
 * persistently-stuck signup impossible to diagnose from the outside. */
export function phoneOtpSendErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/too-many-requests":
      return "Too many attempts from this device — please wait a while before requesting another code.";
    case "auth/invalid-phone-number":
      return "That doesn't look like a valid mobile number.";
    case "auth/quota-exceeded":
      return "SMS limit reached for now — please try again in a few minutes.";
    case "auth/credential-already-in-use":
    case "auth/account-exists-with-different-credential":
      return "That mobile number is already registered to a different account.";
    case "auth/captcha-check-failed":
    case "auth/invalid-app-credential":
    case "auth/argument-error":
      return "Verification check failed — please refresh the page and try again.";
    case "auth/network-request-failed":
      return "No internet connection — please check and try again.";
    default:
      return "Could not send the code — please try again.";
  }
}

/** Maps a signInWithEmail failure to a specific message. Deliberately tells
 * the user which of email/password was wrong (auth/user-not-found vs.
 * auth/wrong-password) rather than a blended "incorrect email or password" —
 * an explicit product choice to prioritize a friendlier error over hiding
 * whether an identifier is registered. Note Firebase's newer projects (with
 * Email Enumeration Protection on) collapse both of those into the ambiguous
 * auth/invalid-credential instead, in which case we can't tell them apart and
 * fall back to the blended message. */
export function emailLoginErrorMessage(err: unknown, isEmail: boolean): string {
  const code = (err as { code?: string })?.code ?? "";
  const noun = isEmail ? "email address" : "mobile number";
  switch (code) {
    case "auth/user-not-found":
      return `No account found with that ${noun}.`;
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/invalid-credential":
      return `Incorrect ${noun} or password.`;
    case "auth/too-many-requests":
      return "Too many attempts — please wait a while before trying again.";
    case "auth/user-disabled":
      return "This account has been disabled — please contact support.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/network-request-failed":
      return "No internet connection — please check and try again.";
    default:
      return "Login failed — please try again.";
  }
}

/** Same idea as phoneOtpSendErrorMessage, for the confirm() step. */
export function phoneOtpVerifyErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/code-expired":
      return "That code expired — request a new one.";
    case "auth/too-many-requests":
      return "Too many attempts — please wait a while and request a new code.";
    default:
      return "Incorrect code — please try again.";
  }
}

/** Attaches password-login capability to a phone-verified account (so future
 * logins don't need SMS again), using the account's real email. Call right
 * after a fresh signup's OTP confirms. Throws (e.g. `auth/provider-already-
 * linked`) if the current user already has an email credential — callers
 * should treat that as non-fatal and let the server-side registration check
 * decide whether this is a genuine duplicate or a resumed signup. */
export async function linkPasswordCredential(email: string, password: string) {
  if (!auth.currentUser) throw new Error("No signed-in user to link a password to.");
  const credential = EmailAuthProvider.credential(email, password);
  await linkWithCredential(auth.currentUser, credential);
}
