"use client";

import { useRef, useState } from "react";

const MAX_SIDE = 1600;
const MAX_FILES = 6;

/** Shrinks a phone photo to ≤1600px JPEG (~200–400 KB) so uploads stay well under Vercel's 4.5 MB limit. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
}

/** File picker that opens the camera on phones and compresses before the form submits. */
export function PhotoInput({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (!enabled)
    return <p className="text-xs text-navy/55 sm:col-span-2">Photo uploads switch on once SUPABASE_SECRET_KEY is set. Until then, paste photo links below.</p>;

  return (
    <div className="space-y-2 sm:col-span-2">
      <label className="label" htmlFor="photoFiles">Photos (up to {MAX_FILES})</label>
      <input
        ref={ref}
        id="photoFiles"
        name="photoFiles"
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="input"
        onChange={async (e) => {
          const picked = Array.from(e.target.files ?? []).slice(0, MAX_FILES);
          setBusy(true);
          const small = await Promise.all(picked.map(shrink));
          const dt = new DataTransfer();
          small.forEach((f) => dt.items.add(f));
          if (ref.current) ref.current.files = dt.files;
          previews.forEach(URL.revokeObjectURL);
          setPreviews(small.map((f) => URL.createObjectURL(f)));
          setBusy(false);
        }}
      />
      {busy && <p className="text-xs text-navy/55">Preparing photos…</p>}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {previews.map((src) => <img key={src} src={src} alt="" className="h-16 w-16 rounded-xl object-cover" />)}
        </div>
      )}
    </div>
  );
}
