// Import the narrow subpaths rather than the package root — the root entry
// pulls in JWE encrypt/decrypt (and its deflate/CompressionStream code,
// which Next.js's Edge Runtime bundler warns about) even though jwtVerify
// only ever needs JWS (signature) verification.
import { jwtVerify } from "jose/jwt/verify";
import { createRemoteJWKSet } from "jose/jwks/remote";

// Verifies the Firebase ID token stored in the session cookie. This runs in
// the Edge runtime (middleware), where the Admin SDK isn't available — jose's
// jwtVerify + a remote JWKS is the standard Edge-compatible way to check a
// Firebase ID token's signature without it.
//
// Tradeoff vs. a real Firebase "session cookie" (which can live up to 14
// days): ID tokens expire in ~1 hour. The client refreshes and re-syncs the
// cookie automatically while the tab is open (see hooks/useUser.ts), but a
// hard navigation to a protected route after 1+ hour of being fully closed
// can bounce to /login even though the client SDK would have silently
// refreshed given the chance. Next.js 14 middleware can only run on the Edge
// runtime (Node.js middleware isn't available until Next 15.2+), which is
// what rules out using the Admin SDK — and therefore real session cookies —
// directly in middleware here.

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export const SESSION_COOKIE_NAME = "session";

export interface DecodedSession {
  uid: string;
  // `null` means the ID token doesn't carry a role claim yet — e.g. a
  // session cookie synced in the narrow window right after signup, before
  // Identity Platform's custom-claims propagation catches up with the
  // client's token refresh (see waitForRoleClaim in lib/firebase/auth-client.ts,
  // which retries specifically to avoid this). Previously this silently
  // defaulted to "client", which turned "role not known yet" into a
  // confident wrong answer — middleware would redirect a mismatched path to
  // `/client`, the Firestore-authoritative client layout would bounce them
  // back out, and middleware would send them right back to `/client`: an
  // infinite loop. Callers must treat `null` as "unresolved", not "client".
  role: string | null;
  email?: string;
}

export async function verifySessionToken(token: string): Promise<DecodedSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    if (typeof payload.sub !== "string") return null;
    return {
      uid: payload.sub,
      role: typeof payload.role === "string" ? payload.role : null,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}
