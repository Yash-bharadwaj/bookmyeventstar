// One-time migration: move existing Cloudinary-hosted media to Firebase
// Storage now that the project is on the Blaze plan. Safe to re-run —
// skips anything already pointing at Firebase Storage.
//
//   node scripts/migrate-cloudinary-to-storage.mjs --dry-run
//   node scripts/migrate-cloudinary-to-storage.mjs
//   node scripts/migrate-cloudinary-to-storage.mjs --delete-originals   (run only after verifying the migration)
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { v2 as cloudinary } from "cloudinary";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const DELETE_ORIGINALS = args.includes("--delete-originals");

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2];
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  env[m[1]] = v;
}

if (!env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
  console.error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set in .env.local — add it before running this script.");
  process.exit(1);
}

const app = initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});
const db = getFirestore(app);
const bucket = getStorage(app).bucket();

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const CLOUDINARY_HOST = "res.cloudinary.com";
const STORAGE_HOST = "firebasestorage.googleapis.com";

function isCloudinaryUrl(url) {
  return typeof url === "string" && url.includes(CLOUDINARY_HOST);
}
function isAlreadyMigrated(url) {
  return typeof url === "string" && url.includes(STORAGE_HOST);
}

async function uploadToStorage(path, sourceUrl, contentType) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${sourceUrl}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const token = randomUUID();
  const file = bucket.file(path);
  await file.save(buffer, {
    metadata: {
      contentType: contentType ?? res.headers.get("content-type") ?? "application/octet-stream",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

const summary = { migrated: 0, skipped: 0, failed: [] };

async function migrateAvatars() {
  const snap = await db.collection("users").get();
  for (const docSnap of snap.docs) {
    const avatarUrl = docSnap.data().avatar_url;
    if (!avatarUrl) continue;
    if (isAlreadyMigrated(avatarUrl)) { summary.skipped++; continue; }
    if (!isCloudinaryUrl(avatarUrl)) continue;

    const path = `artist-media/profile/${docSnap.id}`;
    console.log(`[avatar] ${docSnap.id}: ${avatarUrl} -> ${path}`);
    if (DRY_RUN) { summary.migrated++; continue; }
    try {
      const newUrl = await uploadToStorage(path, avatarUrl);
      await docSnap.ref.update({ avatar_url: newUrl });
      summary.migrated++;
      if (DELETE_ORIGINALS) await destroyCloudinaryAsset(avatarUrl, "image");
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      summary.failed.push({ doc: `users/${docSnap.id}`, url: avatarUrl, error: err.message });
    }
  }
}

async function migrateMedia() {
  const profiles = await db.collection("artistProfiles").get();
  for (const profile of profiles.docs) {
    const mediaSnap = await profile.ref.collection("media").get();
    for (const mediaDoc of mediaSnap.docs) {
      const data = mediaDoc.data();
      const url = data.url;
      if (!url) continue;
      if (isAlreadyMigrated(url)) { summary.skipped++; continue; }
      if (!isCloudinaryUrl(url)) continue;

      const path = `artist-media/${profile.id}/${mediaDoc.id}`;
      console.log(`[media] ${profile.id}/${mediaDoc.id}: ${url} -> ${path}`);
      if (DRY_RUN) { summary.migrated++; continue; }
      try {
        const newUrl = await uploadToStorage(path, url);
        await mediaDoc.ref.update({ url: newUrl, storage_path: path });
        summary.migrated++;
        if (DELETE_ORIGINALS) await destroyCloudinaryAsset(url, data.type === "video" ? "video" : "image");
      } catch (err) {
        console.error(`  FAILED: ${err.message}`);
        summary.failed.push({ doc: `artistProfiles/${profile.id}/media/${mediaDoc.id}`, url, error: err.message });
      }
    }
  }
}

async function destroyCloudinaryAsset(url, resourceType) {
  // Cloudinary public_id is the URL path minus the leading
  // /<cloud_name>/<resource_type>/<delivery_type>/[version]/ segments and
  // the file extension.
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
  if (!match) return;
  await cloudinary.uploader.destroy(match[1], { resource_type: resourceType }).catch((err) => {
    console.error(`  Cloudinary destroy failed for ${match[1]}: ${err.message}`);
  });
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}${DELETE_ORIGINALS ? " + delete originals" : ""}\n`);
  await migrateAvatars();
  await migrateMedia();

  console.log("\n--- Summary ---");
  console.log(`Migrated: ${summary.migrated}`);
  console.log(`Skipped (already migrated): ${summary.skipped}`);
  console.log(`Failed: ${summary.failed.length}`);
  if (summary.failed.length) {
    console.log(JSON.stringify(summary.failed, null, 2));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
