// Tops up the `categories` and `cities` Firestore collections with a
// comprehensive default set, without touching anything already there.
// Safe to re-run — skips any candidate whose name already exists
// (case-insensitive match against name only, ignoring state for cities).
//
// Run with: node scripts/seed-more-cities-categories.mjs
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

const CATEGORY_CANDIDATES = [
  // Already-seeded 15, harmless to list again (dedup skips them):
  "Bollywood Singer", "Classical Singer", "Ghazal Singer", "Sufi Singer",
  "DJ", "Band", "Comedian", "Anchor / Emcee", "Dancer / Dance Troupe",
  "Magician", "Instrumentalist", "Motivational Speaker", "Mimicry Artist",
  "Puppeteer", "Folk Artist",
  // New additions:
  "Rock Band", "Cover Band", "Fusion Band", "Playback Singer", "Wedding Singer",
  "Qawwali Singer", "Bhajan Singer", "Rapper / Hip-Hop Artist", "Beatboxer",
  "Violinist", "Flutist", "Guitarist", "Tabla Player", "Dhol Player", "Drummer",
  "Pianist / Keyboardist", "Sitar Player", "Saxophonist", "String Quartet",
  "Choir Group", "Bollywood Dance Troupe", "Classical Dancer", "Contemporary Dancer",
  "Bhangra Dance Troupe", "Belly Dancer", "Fire Performer", "Acrobat", "Aerialist",
  "Improv Comedy Group", "Caricature Artist", "Mehendi Artist", "Live Painter",
  "Tarot Reader", "Face Painter", "Balloon Artist", "Storyteller", "Percussionist",
  "Karaoke Host", "Voiceover Artist", "Celebrity Impersonator",
];

const CITY_CANDIDATES = [
  // Already-seeded 20:
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
  // New additions — round 1 (state/region depth):
  { name: "Faridabad", state: "Haryana" }, { name: "Vadodara", state: "Gujarat" },
  { name: "Nashik", state: "Maharashtra" }, { name: "Mysuru", state: "Karnataka" },
  { name: "Madurai", state: "Tamil Nadu" }, { name: "Vijayawada", state: "Andhra Pradesh" },
  { name: "Agra", state: "Uttar Pradesh" }, { name: "Varanasi", state: "Uttar Pradesh" },
  { name: "Amritsar", state: "Punjab" }, { name: "Ludhiana", state: "Punjab" },
  { name: "Patna", state: "Bihar" }, { name: "Ranchi", state: "Jharkhand" },
  { name: "Bhubaneswar", state: "Odisha" }, { name: "Raipur", state: "Chhattisgarh" },
  { name: "Guwahati", state: "Assam" }, { name: "Dehradun", state: "Uttarakhand" },
  { name: "Jodhpur", state: "Rajasthan" }, { name: "Udaipur", state: "Rajasthan" },
  { name: "Thiruvananthapuram", state: "Kerala" }, { name: "Panaji", state: "Goa" },
  // New additions — round 2 (every remaining state/UT + tier-2/3 depth):
  { name: "Srinagar", state: "Jammu and Kashmir" }, { name: "Jammu", state: "Jammu and Kashmir" },
  { name: "Shimla", state: "Himachal Pradesh" }, { name: "Shillong", state: "Meghalaya" },
  { name: "Imphal", state: "Manipur" }, { name: "Agartala", state: "Tripura" },
  { name: "Aizawl", state: "Mizoram" }, { name: "Kohima", state: "Nagaland" },
  { name: "Itanagar", state: "Arunachal Pradesh" }, { name: "Gangtok", state: "Sikkim" },
  { name: "Puducherry", state: "Puducherry" }, { name: "Port Blair", state: "Andaman and Nicobar Islands" },
  { name: "Leh", state: "Ladakh" }, { name: "Silvassa", state: "Dadra and Nagar Haveli and Daman and Diu" },
  { name: "Thane", state: "Maharashtra" }, { name: "Aurangabad", state: "Maharashtra" },
  { name: "Solapur", state: "Maharashtra" }, { name: "Kolhapur", state: "Maharashtra" },
  { name: "Mangaluru", state: "Karnataka" }, { name: "Hubballi", state: "Karnataka" },
  { name: "Belagavi", state: "Karnataka" }, { name: "Udupi", state: "Karnataka" },
  { name: "Salem", state: "Tamil Nadu" }, { name: "Tiruchirappalli", state: "Tamil Nadu" },
  { name: "Tirunelveli", state: "Tamil Nadu" }, { name: "Vellore", state: "Tamil Nadu" },
  { name: "Warangal", state: "Telangana" }, { name: "Nizamabad", state: "Telangana" },
  { name: "Guntur", state: "Andhra Pradesh" }, { name: "Tirupati", state: "Andhra Pradesh" },
  { name: "Nellore", state: "Andhra Pradesh" }, { name: "Kanpur", state: "Uttar Pradesh" },
  { name: "Ghaziabad", state: "Uttar Pradesh" }, { name: "Meerut", state: "Uttar Pradesh" },
  { name: "Prayagraj", state: "Uttar Pradesh" }, { name: "Bareilly", state: "Uttar Pradesh" },
  { name: "Aligarh", state: "Uttar Pradesh" }, { name: "Moradabad", state: "Uttar Pradesh" },
  { name: "Gorakhpur", state: "Uttar Pradesh" }, { name: "Jalandhar", state: "Punjab" },
  { name: "Patiala", state: "Punjab" }, { name: "Mohali", state: "Punjab" },
  { name: "Rajkot", state: "Gujarat" }, { name: "Bhavnagar", state: "Gujarat" },
  { name: "Jamnagar", state: "Gujarat" }, { name: "Gandhinagar", state: "Gujarat" },
  { name: "Ajmer", state: "Rajasthan" }, { name: "Kota", state: "Rajasthan" },
  { name: "Bikaner", state: "Rajasthan" }, { name: "Kozhikode", state: "Kerala" },
  { name: "Thrissur", state: "Kerala" }, { name: "Kollam", state: "Kerala" },
  { name: "Kottayam", state: "Kerala" }, { name: "Siliguri", state: "West Bengal" },
  { name: "Durgapur", state: "West Bengal" }, { name: "Asansol", state: "West Bengal" },
  { name: "Howrah", state: "West Bengal" }, { name: "Cuttack", state: "Odisha" },
  { name: "Rourkela", state: "Odisha" }, { name: "Jamshedpur", state: "Jharkhand" },
  { name: "Dhanbad", state: "Jharkhand" }, { name: "Bokaro", state: "Jharkhand" },
  { name: "Gwalior", state: "Madhya Pradesh" }, { name: "Jabalpur", state: "Madhya Pradesh" },
  { name: "Ujjain", state: "Madhya Pradesh" }, { name: "Rewa", state: "Madhya Pradesh" },
  { name: "Bilaspur", state: "Chhattisgarh" }, { name: "Bhilai", state: "Chhattisgarh" },
  { name: "Muzaffarpur", state: "Bihar" }, { name: "Gaya", state: "Bihar" },
  { name: "Bhagalpur", state: "Bihar" }, { name: "Dibrugarh", state: "Assam" },
  { name: "Jorhat", state: "Assam" }, { name: "Haridwar", state: "Uttarakhand" },
  { name: "Rishikesh", state: "Uttarakhand" }, { name: "Karnal", state: "Haryana" },
  { name: "Panipat", state: "Haryana" }, { name: "Ambala", state: "Haryana" },
  { name: "Panchkula", state: "Haryana" },
];

async function seed() {
  const [existingCatsSnap, existingCitiesSnap] = await Promise.all([
    db.collection("categories").get(),
    db.collection("cities").get(),
  ]);
  const existingCatNames = new Set(existingCatsSnap.docs.map((d) => (d.data().name ?? "").toLowerCase()));
  const existingCityNames = new Set(existingCitiesSnap.docs.map((d) => (d.data().name ?? "").toLowerCase()));

  const newCats = CATEGORY_CANDIDATES.filter((name) => !existingCatNames.has(name.toLowerCase()));
  const newCities = CITY_CANDIDATES.filter((c) => !existingCityNames.has(c.name.toLowerCase()));

  const batches = [];
  let batch = db.batch();
  let opCount = 0;
  const addOp = (fn) => {
    fn(batch);
    opCount++;
    if (opCount >= 400) {
      batches.push(batch);
      batch = db.batch();
      opCount = 0;
    }
  };

  for (const name of newCats) {
    addOp((b) => b.set(db.collection("categories").doc(), { name, icon: null, description: null, createdAt: new Date() }));
  }
  for (const city of newCities) {
    addOp((b) => b.set(db.collection("cities").doc(), { name: city.name, state: city.state, createdAt: new Date() }));
  }
  batches.push(batch);

  for (const b of batches) await b.commit();

  console.log(`Categories: ${newCats.length} added, ${CATEGORY_CANDIDATES.length - newCats.length} already existed.`);
  console.log(`Cities: ${newCities.length} added, ${CITY_CANDIDATES.length - newCities.length} already existed.`);
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
