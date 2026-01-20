// lib/storage.ts
import { supabase } from "./supabase";

export type FileType = File | Blob | ArrayBuffer;
export type MediaType = "image" | "video" | "audio" | "file";

export interface UploadOptions {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
}

// Extended type for storage upload result
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

// Upload a file to Supabase Storage
export async function uploadFile(
  bucket: string,
  path: string,
  file: FileType,
  options?: UploadOptions
): Promise<UploadResult> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, options);

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

  // Type assertion to handle incomplete Supabase types
  const uploadData = data as unknown as StorageUploadResult;

  return {
    url: urlData.publicUrl,
    path: uploadData.path,
    fullPath: uploadData.fullPath,
    id: uploadData.id,
    bucket,
  };
}

// Delete a file from storage
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

// List files in a bucket
export async function listFiles(
  bucket: string,
  path?: string,
  limit = 100,
  offset = 0
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path, { limit, offset });

  if (error) throw error;
  return data;
}

// Upload profile avatar
export async function uploadAvatar(
  userId: string,
  file: FileType,
  fileExtension: string = "jpg"
): Promise<UploadResult> {
  const path = `avatars/${userId}/${Date.now()}.${fileExtension}`;
  const result = await uploadFile("public", path, file, {
    contentType: file instanceof File ? file.type : "image/jpeg",
    cacheControl: "3600",
    upsert: true,
  });
  return result;
}

// Upload post media
export async function uploadPostMedia(
  userId: string,
  file: FileType,
  mediaType: MediaType = "image"
): Promise<UploadResult> {
  const extensions = {
    image: "jpg",
    video: "mp4",
    audio: "mp3",
    file: "pdf",
  };

  const path = `posts/${userId}/${Date.now()}.${extensions[mediaType]}`;
  const result = await uploadFile("public", path, file, {
    contentType:
      file instanceof File ? file.type : getDefaultContentType(mediaType),
    cacheControl: "86400",
  });
  return result;
}

function getDefaultContentType(mediaType: MediaType): string {
  switch (mediaType) {
    case "image":
      return "image/jpeg";
    case "video":
      return "video/mp4";
    case "audio":
      return "audio/mpeg";
    case "file":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

// Generate signed URL for private files
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

// Get public URL for a file
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Download a file
export async function downloadFile(
  bucket: string,
  path: string
): Promise<Blob> {
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) throw error;
  return data;
}

// Copy a file within storage
export async function copyFile(
  sourceBucket: string,
  sourcePath: string,
  destinationBucket: string,
  destinationPath: string
): Promise<UploadResult> {
  const { data, error } = await supabase.storage
    .from(sourceBucket)
    .copy(sourcePath, `${destinationBucket}/${destinationPath}`);

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(destinationBucket)
    .getPublicUrl(destinationPath);

  // Type assertion for copy result
  const copyData = data as unknown as StorageUploadResult;

  return {
    url: urlData.publicUrl,
    path: copyData.path,
    fullPath: copyData.fullPath,
    id: copyData.id,
    bucket: destinationBucket,
  };
}

// Alternative simpler version if you don't need all properties:
export async function simpleUploadFile(
  bucket: string,
  path: string,
  file: FileType,
  options?: UploadOptions
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, options);

  if (error) throw error;

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

// Create folder/directory
export async function createFolder(
  bucket: string,
  path: string
): Promise<void> {
  // Create an empty file to simulate a folder
  const { error } = await supabase.storage
    .from(bucket)
    .upload(`${path}/.keep`, new Uint8Array(0), {
      contentType: "application/octet-stream",
    });

  if (error) throw error;
}

// Get file metadata
export async function getFileMetadata(bucket: string, path: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path.split("/").slice(0, -1).join("/"));

  if (error) throw error;

  const file = data?.find((item) => item.name === path.split("/").pop());
  return file;
}

// Check if file exists
export async function fileExists(
  bucket: string,
  path: string
): Promise<boolean> {
  try {
    await supabase.storage.from(bucket).download(path);
    return true;
  } catch {
    return false;
  }
}
