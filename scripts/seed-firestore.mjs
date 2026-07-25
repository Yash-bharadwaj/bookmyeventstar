// One-time seed script for a fresh Firestore setup — run with:
//   node scripts/seed-firestore.mjs
// Reads Firebase Admin credentials from .env.local. Safe to re-run (upserts).
import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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
const db = getFirestore(app);

const ARTIST_CATEGORIES = [
  "Bollywood Singer", "Classical Singer", "Ghazal Singer", "Sufi Singer",
  "DJ", "Band", "Comedian", "Anchor / Emcee", "Dancer / Dance Troupe",
  "Magician", "Instrumentalist", "Motivational Speaker", "Mimicry Artist",
  "Puppeteer", "Folk Artist",
];

const INDIA_CITIES = [
  { name: "Mumbai", state: "Maharashtra" }, { name: "Delhi", state: "Delhi" },
  { name: "Bengaluru", state: "Karnataka" }, { name: "Hyderabad", state: "Telangana" },
  { name: "Chennai", state: "Tamil Nadu" }, { name: "Kolkata", state: "West Bengal" },
  { name: "Pune", state: "Maharashtra" }, { name: "Ahmedabad", state: "Gujarat" },
  { name: "Jaipur", state: "Rajasthan" }, { name: "Surat", state: "Gujarat" },
  { name: "Lucknow", state: "Uttar Pradesh" }, { name: "Chandigarh", state: "Punjab" },
  { name: "Kochi", state: "Kerala" }, { name: "Indore", state: "Madhya Pradesh" },
  { name: "Bhopal", state: "Madhya Pradesh" }, { name: "Nagpur", state: "Maharashtra" },
  { name: "Visakhapatnam", state: "Andhra Pradesh" }, { name: "Coimbatore", state: "Tamil Nadu" },
  { name: "Gurgaon", state: "Haryana" }, { name: "Noida", state: "Uttar Pradesh" },
];

async function seed() {
  const batch = db.batch();

  for (const name of ARTIST_CATEGORIES) {
    const ref = db.collection("categories").doc();
    batch.set(ref, { name, icon: null, description: null, createdAt: new Date() });
  }

  for (const city of INDIA_CITIES) {
    const ref = db.collection("cities").doc();
    batch.set(ref, { name: city.name, state: city.state, createdAt: new Date() });
  }

  batch.set(db.collection("settings").doc("artist_share_pct"), { value: "70" });
  batch.set(db.collection("settings").doc("coordinator_workload_max"), { value: "8" });
  batch.set(db.collection("settings").doc("advance_payment_pct"), { value: "30" });
  batch.set(db.collection("settings").doc("cities"), { value: INDIA_CITIES.map((c) => c.name) });

  await batch.commit();
  console.log(`Seeded ${ARTIST_CATEGORIES.length} categories, ${INDIA_CITIES.length} cities, 4 settings docs.`);
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
