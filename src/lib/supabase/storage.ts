// The public "lessons" bucket: one folder per lesson, named after its uuid.

import { supabase } from "./server";

export const BUCKET = "lessons";

export const lessonPaths = {
  page: (id: string, n: number) => `${id}/pages/${n}.jpg`,
  scene: (id: string, n: number) => `${id}/scenes/${n}.jpg`,
  voice: (id: string) => `${id}/voice.wav`,
  video: (id: string) => `${id}/video.mp4`,
};

/** Uploads a file, replacing any file already at that path. */
export async function uploadFile(path: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const { error } = await supabase().storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Upload to ${path} failed: ${error.message}`);
}

/** A URL that takes one raw PUT of the file, for services that never see the Supabase keys (Modal). */
export async function signedUploadUrl(path: string): Promise<string> {
  const { data, error } = await supabase().storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
  if (error) throw new Error(`Signed upload URL for ${path} failed: ${error.message}`);
  return data.signedUrl;
}

export function publicUrl(path: string): string {
  return supabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
