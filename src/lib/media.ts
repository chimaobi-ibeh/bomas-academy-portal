import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

const SHRINKABLE = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIDE = 1800;
const SKIP_BELOW = 500 * 1024;

/**
 * Phone photos are often 3-10 MB, which is far too heavy for families on mobile data.
 * Photos are scaled down in the browser before they are uploaded (longest side 1800px,
 * JPEG). Anything else, or anything that fails, is uploaded exactly as it was.
 */
async function shrinkImage(file: File): Promise<File> {
  if (!SHRINKABLE.includes(file.type) || file.size < SKIP_BELOW) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function uploadMedia(original: File, folder: string): Promise<string> {
  const file = await shrinkImage(original);
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from("media")
    .createSignedUrl(path, TEN_YEARS);
  if (signErr) throw signErr;
  return data.signedUrl;
}
