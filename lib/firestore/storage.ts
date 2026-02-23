// lib/firestore/storage.ts — FIREBASE STORAGE ✅

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

/* =========================================================
   HELPERS
========================================================= */

function generatePath(folder: string, ext: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2);
  return `${folder}/${user.uid}/${timestamp}-${random}.${ext}`;
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return await response.blob();
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

/* =========================================================
   MAIN UPLOAD
========================================================= */

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

    const ext = uri.split(".").pop() || "bin";
    const storagePath = generatePath(folder, ext);

    const storageRef = ref(storage, storagePath);
    const blob = await uriToBlob(uploadUri);

    await uploadBytes(storageRef, blob);

    const downloadURL = await getDownloadURL(storageRef);

    let thumbnailUrl: string | undefined;

    if (options.generateThumbnails && type === "video") {
      const thumbUri = await generateVideoThumbnail(uri);
      const thumbPath = generatePath("thumbnails", "jpg");

      const thumbRef = ref(storage, thumbPath);
      const thumbBlob = await uriToBlob(thumbUri);

      await uploadBytes(thumbRef, thumbBlob);
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
      error: error.message || "Upload failed",
    };
  }
}

/* =========================================================
   CHAT FILE UPLOAD (used by ChatInput.tsx)
========================================================= */

export async function uploadChatFile(params: {
  uri: string;
  storagePath: string;
  contentType: string;
}): Promise<{ downloadURL: string }> {
  const storageRef = ref(storage, params.storagePath);
  const blob = await uriToBlob(params.uri);

  await uploadBytes(storageRef, blob, { contentType: params.contentType });

  const downloadURL = await getDownloadURL(storageRef);
  return { downloadURL };
}

/* =========================================================
   DELETE
========================================================= */

export async function deleteFile(storagePath: string) {
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}
