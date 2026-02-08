// lib/storage.ts
import { supabase } from "./supabase";

export type FileType = File | Blob | ArrayBuffer | Uint8Array;
export type MediaType = "image" | "video" | "audio" | "file";

export interface UploadOptions {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
}

interface StorageUploadResult {
  id: string;
  path: string;
  fullPath: string;
}

export interface UploadResult {
  url: string;
  path: string;
  fullPath: string;
  id: string;
  bucket: string;
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: FileType,
  options?: UploadOptions,
): Promise<UploadResult> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file as any, options);
  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  const uploadData = data as unknown as StorageUploadResult;

  return {
    url: urlData.publicUrl,
    path: uploadData.path,
    fullPath: uploadData.fullPath,
    id: uploadData.id,
    bucket,
  };
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export async function uploadAvatar(
  userId: string,
  file: FileType,
  fileExtension: string = "jpg",
): Promise<UploadResult> {
  // ✅ consistent bucket + path
  const bucket = "avatars";
  const path = `${userId}/${Date.now()}.${fileExtension}`;

  const contentType =
    file instanceof File
      ? file.type
      : fileExtension === "png"
        ? "image/png"
        : "image/jpeg";

  return uploadFile(bucket, path, file, {
    contentType,
    cacheControl: "3600",
    upsert: true,
  });
}

export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
