// lib/uploads.ts — FIREBASE ✅ (Drop-in replacement for Supabase version)
// ✅ FIX: replaced fetch().blob() with FileSystem.readAsStringAsync + uploadString(base64)
//         fetch().blob() crashes on Android for local file URIs

import { MediaItem, MediaType } from "@/components/media/MediaUpload";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { getAuth } from "firebase/auth";
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadString,
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
  thumbnailSize?: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  error?: string;
  name?: string;
  size?: number;
  type?: string;
  duration?: number;
  storagePath?: string;
  thumbnailStoragePath?: string;
}

function extFromName(name: string, fallback: string) {
  const clean = name.split("?")[0];
  const ext = clean.split(".").pop()?.toLowerCase();
  return ext || fallback;
}

function mimeFromExt(ext: string) {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    mp4: "video/mp4",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    pdf: "application/pdf",
    txt: "text/plain",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return map[ext] || "application/octet-stream";
}

function makeStoragePath(folder: string, userId: string, name: string) {
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2);
  const ext = extFromName(name, "bin");
  return `${folder}/${userId}/${ts}-${rnd}.${ext}`;
}

// ✅ FIX: read file as base64 via FileSystem instead of fetch().blob()
// fetch().blob() throws "Creating blobs from ArrayBuffer is not supported" on Android
async function uriToBase64(uri: string): Promise<string> {
  return await FileSystem.readAsStringAsync(uri, {
    encoding: "base64" as any,
  });
}

async function compressImage(uri: string, options: UploadOptions) {
  try {
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
  } catch {
    return uri;
  }
}

async function generateImageThumb(uri: string, size = 300) {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: size, height: size } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    return uri;
  }
}

async function generateVideoThumb(uri: string) {
  try {
    const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
      time: 1000,
      quality: 0.7,
    });
    return thumbUri;
  } catch {
    return uri;
  }
}

export class UploadService {
  private folder = "media";

  constructor(folder?: string) {
    if (folder) this.folder = folder;
  }

  async uploadFile(
    uri: string,
    originalName: string,
    type: MediaType,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) throw new Error("File does not exist");
      if (info.size && info.size > MAX_FILE_SIZE) {
        throw new Error(
          `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        );
      }

      let uploadUri = uri;
      if (type === "image" && options.compressImages) {
        uploadUri = await compressImage(uri, options);
      }

      const ext = extFromName(originalName, type === "video" ? "mp4" : "jpg");
      const contentType = mimeFromExt(ext);
      const storagePath = makeStoragePath(this.folder, user.uid, originalName);
      const fileRef = ref(storage, storagePath);

      // ✅ Use base64 + uploadString — works on all Android versions
      const base64 = await uriToBase64(uploadUri);
      await uploadString(fileRef, base64, "base64", { contentType });
      const url = await getDownloadURL(fileRef);

      let thumbnailUrl: string | undefined;
      let thumbnailStoragePath: string | undefined;

      if (options.generateThumbnails) {
        const thumbSource =
          type === "image"
            ? await generateImageThumb(uploadUri, options.thumbnailSize ?? 300)
            : type === "video"
              ? await generateVideoThumb(uri)
              : null;

        if (thumbSource) {
          thumbnailStoragePath = makeStoragePath(
            "thumbnails",
            user.uid,
            `${originalName}.jpg`,
          );
          const thumbRef = ref(storage, thumbnailStoragePath);
          const thumbBase64 = await uriToBase64(thumbSource);
          await uploadString(thumbRef, thumbBase64, "base64", {
            contentType: "image/jpeg",
          });
          thumbnailUrl = await getDownloadURL(thumbRef);
        }
      }

      return {
        success: true,
        url,
        thumbnailUrl,
        name: originalName,
        size: info.size,
        type: contentType,
        storagePath,
        thumbnailStoragePath,
      };
    } catch (e: any) {
      return { success: false, error: e?.message || "Upload failed" };
    }
  }

  async uploadMultiple(
    files: { uri: string; name: string; type: MediaType }[],
    options: UploadOptions = {},
  ) {
    const out: UploadResult[] = [];
    for (const f of files)
      out.push(await this.uploadFile(f.uri, f.name, f.type, options));
    return out;
  }

  async deleteFile(storagePath: string) {
    try {
      await deleteObject(ref(storage, storagePath));
      return true;
    } catch {
      return false;
    }
  }

  async uploadFromImagePicker(
    pickerResult: ImagePicker.ImagePickerResult,
    options: UploadOptions = {},
  ): Promise<MediaItem[]> {
    if (pickerResult.canceled) return [];
    const items: MediaItem[] = [];

    for (const asset of pickerResult.assets) {
      const type: MediaType = asset.type === "video" ? "video" : "image";
      const name =
        asset.fileName ||
        `media_${Date.now()}.${type === "video" ? "mp4" : "jpg"}`;
      const res = await this.uploadFile(asset.uri, name, type, options);

      if (res.success && res.url) {
        items.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          uri: res.url,
          type,
          name,
          size: res.size || asset.fileSize || 0,
          duration:
            type === "video" ? (asset.duration ?? undefined) : undefined,
          thumbnail: res.thumbnailUrl || res.url,
          storagePath: res.storagePath,
        } as any);
      }
    }

    return items;
  }

  async pickAndUploadImages(options: UploadOptions = {}) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return [];
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });
    return this.uploadFromImagePicker(res, {
      compressImages: true,
      generateThumbnails: true,
      ...options,
    });
  }

  async pickAndUploadVideos(options: UploadOptions = {}) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return [];
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
      quality: 1,
    });
    return this.uploadFromImagePicker(res, {
      generateThumbnails: true,
      ...options,
    });
  }

  async recordAndUploadVideo(options: UploadOptions = {}) {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return [];
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
      quality: 1,
    });
    return this.uploadFromImagePicker(res, {
      generateThumbnails: true,
      ...options,
    });
  }

  async createSignedUrl(_filePath: string, _expiresIn = 3600) {
    return null;
  }
}

export const uploadService = new UploadService();

export async function uploadMediaItem(
  item: MediaItem,
  options: UploadOptions = {},
) {
  if (item.uri.startsWith("http")) return item;

  const res = await uploadService.uploadFile(
    item.uri,
    item.name || `file_${Date.now()}`,
    item.type,
    options,
  );
  if (!res.success || !res.url) throw new Error(res.error || "Upload failed");

  return {
    ...item,
    uri: res.url,
    thumbnail: res.thumbnailUrl || res.url,
  } as MediaItem;
}

export async function uploadMediaItems(
  items: MediaItem[],
  options: UploadOptions = {},
) {
  const out: MediaItem[] = [];
  for (const it of items) {
    try {
      out.push(await uploadMediaItem(it, options));
    } catch {}
  }
  return out;
}

export async function deleteMediaItems(items: MediaItem[]) {
  for (const it of items as any[]) {
    if (it.storagePath) await uploadService.deleteFile(it.storagePath);
  }
}

export async function getStorageUsage() {
  return {
    total: 100 * 1024 * 1024 * 1024,
    used: 0,
    available: 100 * 1024 * 1024 * 1024,
  };
}
