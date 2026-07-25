// One-time real end-to-end test account seeder — creates one real, sign-in-able
// Firebase Auth user per role. Safe to delete these accounts later (Firebase
// Console > Authentication > Users, and the matching Firestore `users` docs).
import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2];
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  env[m[1]] = v;
}

const app = initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});
const adminAuth = getAuth(app);
const adminDb = getFirestore(app);

const PASSWORD = "TestPass123!";
const STAMP = Date.now();

async function makeUser(role, extra = {}) {
  const email = `qa.${role}.${STAMP}@bookmyeventstar-test.local`;
  const authUser = await adminAuth.createUser({ email, password: PASSWORD, displayName: `QA ${role}` });
  await adminAuth.setCustomUserClaims(authUser.uid, { role });
  await adminDb.collection("users").doc(authUser.uid).set({
    name: `QA ${role}`,
    email,
    phone: extra.phone ?? `+9190000${String(Object.keys(extra).length).padStart(2, "0")}00`,
    role,
    is_active: true,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });
  if (role === "artist") {
    await adminDb.collection("artistProfiles").doc(authUser.uid).set({
      bio: "QA test artist bio, long enough to pass validation checks for completeness scoring.",
      categories: ["DJ", "Bollywood Singer"],
      cities: ["Mumbai", "Pune"],
      base_price: 25000,
      pricing_details: {},
      rating: 4.5,
      total_bookings: 12,
      is_verified: true,
      is_listed: true,
      is_profile_complete: true,
      social_links: { instagram: "qaartist", youtube: "" },
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  }
  return { role, email, uid: authUser.uid };
}

const results = [];
for (const role of ["admin", "coordinator", "artist"]) {
  results.push(await makeUser(role));
}

// Client account uses the phone+password pattern (synthetic email), matching
// how real users sign up via /enquiry — this is the identifier the login
// page's phone path constructs, not something a client "knows" directly.
const clientPhoneDigits = "9000012345";
const clientEmail = `${clientPhoneDigits}@phone.bmes.app`;
const clientAuth = await adminAuth.createUser({
  email: clientEmail,
  password: PASSWORD,
  displayName: "QA client",
  phoneNumber: `+91${clientPhoneDigits}`,
});
await adminAuth.setCustomUserClaims(clientAuth.uid, { role: "client" });
await adminDb.collection("users").doc(clientAuth.uid).set({
  name: "QA client",
  email: "qa.client@bookmyeventstar-test.local",
  phone: `+91${clientPhoneDigits}`,
  role: "client",
  is_active: true,
  created_at: FieldValue.serverTimestamp(),
  updated_at: FieldValue.serverTimestamp(),
});
results.push({ role: "client", email: clientEmail, phone: clientPhoneDigits, uid: clientAuth.uid });

console.log(JSON.stringify({ password: PASSWORD, accounts: results }, null, 2));
