// lib/storage.ts — REACT NATIVE FIREBASE ✅ (keeps existing API surface)
import auth from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";

export type FileType = Blob | ArrayBuffer | Uint8Array | string;
export type MediaType = "image" | "video" | "audio" | "file";

export interface UploadOptions {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
}

export interface UploadResult {
  url: string;
  path: string;
  fullPath: string;
  id: string;
  bucket: string;
}

function makePath(bucket: string, path: string) {
  const uid = auth().currentUser?.uid || "anon";
  const clean = path.startsWith(bucket + "/")
    ? path
    : `${bucket}/${uid}/${path}`;
  return clean;
}

/**
 * Uploads a file to Firebase Storage.
 * - For React Native: pass a local file URI string (file:///... or content://...)
 * - For raw bytes (Uint8Array / base64): use putString or convert beforehand
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: FileType,
  options?: UploadOptions,
): Promise<UploadResult> {
  if (!auth().currentUser) {
    throw new Error("Not authenticated");
  }

  const storagePath = makePath(bucket, path);
  const r = storage().ref(storagePath);

  const metadata = options?.contentType
    ? { contentType: options.contentType }
    : undefined;

  if (typeof file === "string") {
    // Local file URI from expo-image-picker, expo-file-system, etc.
    await r.putFile(file, metadata);
  } else if (file instanceof Uint8Array) {
    // Convert bytes to base64 and use putString
    const base64 = uint8ArrayToBase64(file);
    await r.putString(base64, "base64", metadata);
  } else if (file instanceof ArrayBuffer) {
    const base64 = uint8ArrayToBase64(new Uint8Array(file));
    await r.putString(base64, "base64", metadata);
  } else {
    throw new Error(
      "Unsupported file type for React Native Firebase upload. Pass a file URI string.",
    );
  }

  const url = await r.getDownloadURL();

  return {
    url,
    path: storagePath,
    fullPath: storagePath,
    id: storagePath,
    bucket,
  };
}

export async function deleteFile(_bucket: string, path: string): Promise<void> {
  await storage().ref(path).delete();
}

export function getPublicUrl(_bucket: string, _path: string): string {
  // Firebase does not have deterministic public URLs; use saved downloadURL.
  return "";
}

export async function getSignedUrl(
  _bucket: string,
  path: string,
  _expiresIn = 3600,
): Promise<string> {
  // RN Firebase exposes getDownloadURL which returns a tokenized URL.
  return await storage().ref(path).getDownloadURL();
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // global.btoa exists in Hermes/RN
  // eslint-disable-next-line no-undef
  return global.btoa
    ? global.btoa(binary)
    : Buffer.from(binary, "binary").toString("base64");
}
