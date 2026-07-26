/**
 * Direct browser-to-Cloudinary upload. The file never passes through our
 * server — we only fetch a short-lived signature first, then POST the file
 * straight to Cloudinary. Keeps large video uploads fast and clear of
 * Vercel's serverless function body-size limit.
 */
export async function uploadToCloudinary(
  file: File,
  type: "avatar" | "media"
): Promise<{ url: string; publicId: string; resourceType: "image" | "video" }> {
  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
  if (!signRes.ok) throw new Error("Could not authorize upload");
  const sign = await signRes.json();

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sign.apiKey);
  form.append("timestamp", String(sign.timestamp));
  form.append("signature", sign.signature);
  if (type === "avatar") {
    form.append("public_id", sign.publicId);
    form.append("overwrite", "true");
  } else {
    form.append("folder", sign.folder);
  }

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`, {
    method: "POST",
    body: form,
  });
  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Upload failed");
  }
  const result = await uploadRes.json();
  return { url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type };
}

export async function deleteFromCloudinary(publicId: string, resourceType: "image" | "video") {
  await fetch("/api/cloudinary/destroy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId, resourceType }),
  });
}
