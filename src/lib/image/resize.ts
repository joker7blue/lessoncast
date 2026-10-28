// Shrinks a page photo in the browser before upload: a JPEG of at most 1600 px on its long side
// (about 400 KB instead of 3–5 MB), which saves the teacher's mobile data and fits Vercel's limit.

const MAX_SIDE = 1600;
const QUALITY = 0.85;

export class UnsupportedImageError extends Error {
  constructor() {
    super("The browser can't decode this image");
    this.name = "UnsupportedImageError";
  }
}

export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Decodes the photo (EXIF rotation applied), scales it down and re-encodes it as a JPEG. */
export async function resizeToJpeg(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UnsupportedImageError();
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new UnsupportedImageError();
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw new UnsupportedImageError();
  return blob;
}
