import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./client";

/**
 * Direct browser-to-Firebase-Storage upload, authorized by storage.rules
 * (owner-only write, scoped to the caller's own uid) rather than a
 * server-signed request.
 */
export async function uploadAvatar(uid: string, file: File): Promise<{ url: string; path: string }> {
  const path = `artist-media/profile/${uid}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, path };
}

export async function uploadMedia(uid: string, mediaId: string, file: File): Promise<{ url: string; path: string }> {
  const path = `artist-media/${uid}/${mediaId}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, path };
}

export async function deleteStorageFile(path: string) {
  await deleteObject(ref(storage, path));
}
