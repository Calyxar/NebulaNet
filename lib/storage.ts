// lib/storage.ts — FIREBASE WRAPPER ✅ (keeps existing imports working)

import { getAuth } from "firebase/auth";
import {
    deleteObject,
    getDownloadURL,
    getStorage,
    ref,
    uploadBytes,
} from "firebase/storage";

export type FileType = File | Blob | ArrayBuffer | Uint8Array | string;
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

const storage = getStorage();
const auth = getAuth();

function makePath(bucket: string, path: string) {
  const uid = auth.currentUser?.uid || "anon";
  // If caller passes a full path, keep it; otherwise namespace it
  const clean = path.startsWith(bucket + "/")
    ? path
    : `${bucket}/${uid}/${path}`;
  return clean;
}

async function blobFromAny(file: any): Promise<Blob> {
  if (typeof file === "string") {
    const res = await fetch(file);
    return await res.blob();
  }
  if (file instanceof Blob) return file;
  // Uint8Array / ArrayBuffer
  return new Blob([file]);
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: FileType,
  options?: UploadOptions,
): Promise<UploadResult> {
  const storagePath = makePath(bucket, path);
  const r = ref(storage, storagePath);

  const blob = await blobFromAny(file);
  await uploadBytes(
    r,
    blob,
    options?.contentType ? { contentType: options.contentType } : undefined,
  );

  const url = await getDownloadURL(r);
  const uploadData = {
    id: storagePath,
    path: storagePath,
    fullPath: storagePath,
  } as StorageUploadResult;

  return {
    url,
    path: uploadData.path,
    fullPath: uploadData.fullPath,
    id: uploadData.id,
    bucket,
  };
}

export async function deleteFile(_bucket: string, path: string): Promise<void> {
  await deleteObject(ref(storage, path));
}

export function getPublicUrl(_bucket: string, _path: string): string {
  // Firebase does not have deterministic public URLs; use the saved download URL from upload result.
  return "";
}

export async function getSignedUrl(
  _bucket: string,
  _path: string,
  _expiresIn = 3600,
): Promise<string> {
  // Not supported client-side in Firebase without a backend; use downloadURL from upload.
  return "";
}
