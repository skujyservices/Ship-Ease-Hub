import "server-only";
import crypto from "node:crypto";

/**
 * Package photos in Supabase Storage (private bucket). Stored on Package.photos as
 * "sb:<path>"; plain https links (pasted from partners) are kept as they are.
 * Uses the server-only secret key; photos are shown through short-lived signed URLs.
 */

const BUCKET = "package-photos";

const base = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = () => process.env.SUPABASE_SECRET_KEY;
export const storageReady = () => Boolean(base() && key());

const headers = (extra: Record<string, string> = {}) => ({ apikey: key()!, Authorization: `Bearer ${key()}`, ...extra });

let bucketChecked = false;
async function ensureBucket() {
  if (bucketChecked) return;
  const res = await fetch(`${base()}/storage/v1/bucket/${BUCKET}`, { headers: headers(), cache: "no-store" });
  if (res.status !== 200) {
    const created = await fetch(`${base()}/storage/v1/bucket`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: 5 * 1024 * 1024, allowed_mime_types: ["image/jpeg", "image/png", "image/webp"] }),
    });
    if (!created.ok && created.status !== 409) throw new Error(`Storage bucket: ${created.status} ${await created.text()}`);
  }
  bucketChecked = true;
}

export async function uploadPackagePhoto(file: File): Promise<string> {
  if (!storageReady()) throw new Error("Photo uploads need SUPABASE_SECRET_KEY in the environment.");
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Photos must be JPEG, PNG or WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Each photo must be under 5 MB.");
  await ensureBucket();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const res = await fetch(`${base()}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: headers({ "Content-Type": file.type, "x-upsert": "false" }),
    body: Buffer.from(await file.arrayBuffer()),
  });
  if (!res.ok) throw new Error(`Photo upload failed: ${res.status} ${(await res.text()).slice(0, 160)}`);
  return `sb:${path}`;
}

/** Turns stored photo references into links a browser can open (signed for an hour). */
export async function photoUrls(photos: string[], expiresIn = 3600): Promise<string[]> {
  const stored = photos.filter((p) => p.startsWith("sb:")).map((p) => p.slice(3));
  const signed = new Map<string, string>();
  if (stored.length && storageReady()) {
    const res = await fetch(`${base()}/storage/v1/object/sign/${BUCKET}`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn, paths: stored }),
      cache: "no-store",
    });
    if (res.ok) {
      for (const r of (await res.json()) as { path: string; signedURL?: string }[])
        if (r.signedURL) signed.set(r.path, `${base()}/storage/v1${r.signedURL}`);
    }
  }
  return photos.map((p) => (p.startsWith("sb:") ? signed.get(p.slice(3)) : p)).filter((u): u is string => Boolean(u));
}

/** Deletes stored photos (the "sb:" ones); pasted links are just forgotten. */
export async function deletePhotos(photos: string[]) {
  const paths = photos.filter((p) => p.startsWith("sb:")).map((p) => p.slice(3));
  if (!paths.length || !storageReady()) return;
  const res = await fetch(`${base()}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!res.ok) throw new Error(`Photo delete failed: ${res.status}`);
}
