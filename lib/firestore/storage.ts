// lib/firestore/storage.ts — React Native Firebase ✅
// ✅ FIX: uploadChatFile now copies content:// URIs to the local cache
//    before calling putFile on Android. Firebase Storage's putFile cannot
//    read Android content provider URIs (content://...) directly — it
//    needs a file:// URI. DocumentPicker and some gallery pickers on
//    Android return content:// URIs, which caused every media/document
//    send to fail silently with "Upload Failed".
import { auth } from "@/lib/firebase";
import storage from "@react-native-firebase/storage";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Platform } from "react-native";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

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
    if (!auth.currentUser) throw new Error("Not authenticated");

    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) throw new Error("File does not exist");
    if (fileInfo.size && fileInfo.size > MAX_FILE_SIZE)
      throw new Error("File too large");

    let uploadUri = uri;
    if (type === "image" && options.compressImages) {
      uploadUri = await compressImage(uri, options);
    }

    const ext = guessExtFromUri(uploadUri);
    const storagePath = generatePath(folder, ext);
    const storageRef = storage().ref(storagePath);
    const contentType = guessContentType(type, ext);
    await storageRef.putFile(
      uploadUri,
      contentType ? { contentType } : undefined,
    );
    const downloadURL = await storageRef.getDownloadURL();

    let thumbnailUrl: string | undefined;
    if (options.generateThumbnails && type === "video") {
      const thumbUri = await generateVideoThumbnail(uri);
      const thumbPath = generatePath("thumbnails", "jpg");
      const thumbRef = storage().ref(thumbPath);
      await thumbRef.putFile(thumbUri, { contentType: "image/jpeg" });
      thumbnailUrl = await thumbRef.getDownloadURL();
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
    return { success: false, error: error?.message || "Upload failed" };
  }
}

export async function uploadChatFile(params: {
  uri: string;
  storagePath: string;
  contentType: string;
}): Promise<{ downloadURL: string }> {
  if (!auth.currentUser) throw new Error("Not authenticated");

  let uploadUri = params.uri;

  // ✅ FIX: Android content:// URIs (from DocumentPicker and some gallery
  // pickers) cannot be read directly by Firebase Storage's putFile —
  // copy to the local cache directory first to get a file:// URI.
  if (Platform.OS === "android" && params.uri.startsWith("content://")) {
    const ext = params.storagePath.split(".").pop() ?? "bin";
    const cacheUri = `${(FileSystem as any).cacheDirectory}chat_upload_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: params.uri, to: cacheUri });
    uploadUri = cacheUri;
  }

  const storageRef = storage().ref(params.storagePath);
  await storageRef.putFile(uploadUri, { contentType: params.contentType });
  const downloadURL = await storageRef.getDownloadURL();
  return { downloadURL };
}

export async function deleteFile(storagePath: string) {
  await storage().ref(storagePath).delete();
}
