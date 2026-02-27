import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as VideoThumbnails from "expo-video-thumbnails";
import { getAuth } from "firebase/auth";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";

const storage = getStorage();
const auth = getAuth();

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface UploadOptions {
  compressImages?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  generateThumbnails?: boolean;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  storagePath?: string;
  thumbnailUrl?: string;
  error?: string;
  size?: number;
}

function generatePath(folder: string, ext: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  return `${folder}/${user.uid}/${timestamp}-${random}.${ext}`;
}

function guessExtFromUri(uri: string) {
  const cleaned = uri.split("?")[0].split("#")[0];
  const ext = cleaned.split(".").pop()?.toLowerCase();
  if (!ext || ext.length > 6) return "bin";
  return ext;
}

function guessContentType(type: "image" | "video" | "file", ext: string) {
  if (type === "image") {
    if (ext === "png") return "image/png";
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "webp") return "image/webp";
    if (ext === "heic") return "image/heic";
    if (ext === "gif") return "image/gif";
    return "image/jpeg";
  }

  if (type === "video") {
    if (ext === "mp4") return "video/mp4";
    if (ext === "mov") return "video/quicktime";
    if (ext === "m4v") return "video/x-m4v";
    if (ext === "webm") return "video/webm";
    return "video/mp4";
  }

  return undefined;
}

/**
 * RN/Expo-safe: convert file/content URI -> Blob via XHR
 * Fixes: "Creating blobs from ArrayBuffer/ArrayBufferView are not supported"
 */
async function uriToBlob(uri: string): Promise<Blob> {
  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onerror = () => reject(new Error("Failed to read file"));
    xhr.onload = () => resolve(xhr.response);
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

async function compressImage(
  uri: string,
  options: UploadOptions,
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        resize: {
          width: options.maxWidth || 1920,
          height: options.maxHeight || 1920,
        },
      },
    ],
    {
      compress: options.quality ?? 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return result.uri;
}

async function generateVideoThumbnail(uri: string) {
  const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
    time: 1000,
  });
  return thumbUri;
}

export async function uploadFile(
  uri: string,
  folder: string,
  type: "image" | "video" | "file",
  options: UploadOptions = {},
): Promise<UploadResult> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) throw new Error("File does not exist");

    if (fileInfo.size && fileInfo.size > MAX_FILE_SIZE) {
      throw new Error("File too large");
    }

    let uploadUri = uri;

    if (type === "image" && options.compressImages) {
      uploadUri = await compressImage(uri, options);
    }

    const ext = guessExtFromUri(uploadUri);
    const storagePath = generatePath(folder, ext);
    const storageRef = ref(storage, storagePath);

    const blob = await uriToBlob(uploadUri);

    try {
      const contentType = guessContentType(type, ext);
      await uploadBytes(
        storageRef,
        blob,
        contentType ? { contentType } : undefined,
      );
    } finally {
      (blob as any)?.close?.();
    }

    const downloadURL = await getDownloadURL(storageRef);

    let thumbnailUrl: string | undefined;

    if (options.generateThumbnails && type === "video") {
      const thumbUri = await generateVideoThumbnail(uri);
      const thumbPath = generatePath("thumbnails", "jpg");
      const thumbRef = ref(storage, thumbPath);

      const thumbBlob = await uriToBlob(thumbUri);
      try {
        await uploadBytes(thumbRef, thumbBlob, { contentType: "image/jpeg" });
      } finally {
        (thumbBlob as any)?.close?.();
      }

      thumbnailUrl = await getDownloadURL(thumbRef);
    }

    return {
      success: true,
      url: downloadURL,
      storagePath,
      thumbnailUrl,
      size: fileInfo.size,
    };
  } catch (error: any) {
    console.error("Firebase upload failed:", error);
    return {
      success: false,
      error: error?.message || "Upload failed",
    };
  }
}

export async function uploadChatFile(params: {
  uri: string;
  storagePath: string;
  contentType: string;
}): Promise<{ downloadURL: string }> {
  const storageRef = ref(storage, params.storagePath);

  const blob = await uriToBlob(params.uri);
  try {
    await uploadBytes(storageRef, blob, { contentType: params.contentType });
  } finally {
    (blob as any)?.close?.();
  }

  const downloadURL = await getDownloadURL(storageRef);
  return { downloadURL };
}

export async function deleteFile(storagePath: string) {
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}
