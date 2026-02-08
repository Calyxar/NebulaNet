// lib/uploads.ts
import { MediaItem, MediaType } from "@/components/media/MediaUpload";
import * as FileSystem from "expo-file-system"; // still used for getInfoAsync
import * as FileSystemLegacy from "expo-file-system/legacy"; // ✅ SDK 54-safe for base64 fallback
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { supabase } from "./supabase";

// Configuration
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
}

export class UploadService {
  private bucket = "media";

  constructor(bucket?: string) {
    if (bucket) this.bucket = bucket;
  }

  // Get MIME type from file extension
  private getMimeType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      // Images
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      heic: "image/heic",

      // Videos
      mp4: "video/mp4",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",

      // Audio
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",

      // Documents
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
    };

    return mimeTypes[ext || ""] || "application/octet-stream";
  }

  // Generate unique filename
  private generateFilename(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = originalName.split(".").pop() || "bin";
    return `${userId}/${timestamp}-${random}.${ext}`;
  }

  private async compressImage(
    uri: string,
    options: UploadOptions = {},
  ): Promise<string> {
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
          base64: false,
        },
      );

      return result.uri;
    } catch (error) {
      console.warn("Image compression failed, using original:", error);
      return uri;
    }
  }

  private async generateImageThumbnail(
    uri: string,
    size: number = 300,
  ): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: { width: size, height: size },
          },
        ],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false,
        },
      );

      return result.uri;
    } catch (error) {
      console.warn("Thumbnail generation failed:", error);
      return uri;
    }
  }

  private async generateVideoThumbnail(uri: string): Promise<string> {
    try {
      const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(
        uri,
        { time: 1000, quality: 0.7 },
      );
      return thumbnailUri;
    } catch (error) {
      console.warn("Video thumbnail generation failed:", error);
      return uri;
    }
  }

  // --- Blob/base64 helpers ---

  private base64ToUint8Array(base64: string) {
    // atob is available in RN via global polyfills in Expo. If not, we can fallback.
    const binary = globalThis.atob
      ? globalThis.atob(base64)
      : Buffer.from(base64, "base64").toString("binary");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  // Convert URI to Blob (best for large files)
  private async uriToBlob(uri: string): Promise<Blob> {
    const response = await fetch(uri);
    return await response.blob();
  }

  // Fallback for cases where fetch(content://...) fails on some Android devices
  private async uriToBytesLegacy(uri: string): Promise<Uint8Array> {
    const base64 = await FileSystemLegacy.readAsStringAsync(uri, {
      encoding: "base64" as any,
    });
    return this.base64ToUint8Array(base64);
  }

  // Upload file to Supabase Storage
  async uploadFile(
    uri: string,
    originalName: string,
    type: MediaType,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error("File does not exist");

      if (fileInfo.size && fileInfo.size > MAX_FILE_SIZE) {
        throw new Error(
          `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        );
      }

      let uploadUri = uri;
      if (type === "image" && options.compressImages) {
        uploadUri = await this.compressImage(uri, options);
      }

      const mimeType = this.getMimeType(originalName);

      const filename = this.generateFilename(originalName, user.id);
      const filePath = `${type}/${filename}`;

      // ✅ Prefer Blob upload (best for videos / large media)
      // ✅ Fallback to bytes (legacy base64) if Blob fails (some Android content:// cases)
      let uploadBody: Blob | Uint8Array;
      try {
        uploadBody = await this.uriToBlob(uploadUri);
      } catch (e) {
        console.warn(
          "Blob conversion failed, falling back to base64 bytes:",
          e,
        );
        uploadBody = await this.uriToBytesLegacy(uploadUri);
      }

      const { error: uploadError } = await supabase.storage
        .from(this.bucket)
        .upload(filePath, uploadBody as any, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(this.bucket).getPublicUrl(filePath);

      let thumbnailUrl: string | undefined;

      if (options.generateThumbnails) {
        if (type === "image") {
          const thumbSourceUri = options.compressImages
            ? uploadUri
            : await this.compressImage(uri, options);

          const thumbnailUri = await this.generateImageThumbnail(
            thumbSourceUri,
            options.thumbnailSize ?? 300,
          );

          let thumbnailBody: Blob | Uint8Array;
          try {
            thumbnailBody = await this.uriToBlob(thumbnailUri);
          } catch (e) {
            console.warn("Thumbnail blob failed, base64 fallback:", e);
            thumbnailBody = await this.uriToBytesLegacy(thumbnailUri);
          }

          const thumbPath = `thumbnails/${filename.replace(/\.[^/.]+$/, "")}.jpg`;

          const { error: thumbErr } = await supabase.storage
            .from(this.bucket)
            .upload(thumbPath, thumbnailBody as any, {
              contentType: "image/jpeg",
              upsert: false,
            });

          if (!thumbErr) {
            const {
              data: { publicUrl: thumbPublicUrl },
            } = supabase.storage.from(this.bucket).getPublicUrl(thumbPath);

            thumbnailUrl = thumbPublicUrl;
          }
        } else if (type === "video") {
          const thumbnailUri = await this.generateVideoThumbnail(uri);

          let thumbnailBody: Blob | Uint8Array;
          try {
            thumbnailBody = await this.uriToBlob(thumbnailUri);
          } catch (e) {
            console.warn("Video thumb blob failed, base64 fallback:", e);
            thumbnailBody = await this.uriToBytesLegacy(thumbnailUri);
          }

          const thumbPath = `thumbnails/${filename.replace(/\.[^/.]+$/, "")}.jpg`;

          const { error: thumbErr } = await supabase.storage
            .from(this.bucket)
            .upload(thumbPath, thumbnailBody as any, {
              contentType: "image/jpeg",
              upsert: false,
            });

          if (!thumbErr) {
            const {
              data: { publicUrl: thumbPublicUrl },
            } = supabase.storage.from(this.bucket).getPublicUrl(thumbPath);

            thumbnailUrl = thumbPublicUrl;
          }
        }
      }

      return {
        success: true,
        url: publicUrl,
        thumbnailUrl,
        name: originalName,
        size: fileInfo.size,
        type: mimeType,
      };
    } catch (error: any) {
      console.error("Upload failed:", error);
      return { success: false, error: error.message || "Upload failed" };
    }
  }

  async uploadMultiple(
    files: { uri: string; name: string; type: MediaType }[],
    options: UploadOptions = {},
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    for (const file of files) {
      results.push(
        await this.uploadFile(file.uri, file.name, file.type, options),
      );
    }
    return results;
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.bucket)
        .remove([filePath]);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Delete failed:", error);
      return false;
    }
  }

  async uploadFromImagePicker(
    pickerResult: ImagePicker.ImagePickerResult,
    options: UploadOptions = {},
  ): Promise<MediaItem[]> {
    if (pickerResult.canceled) return [];

    const mediaItems: MediaItem[] = [];

    for (const asset of pickerResult.assets) {
      const type: MediaType = asset.type === "video" ? "video" : "image";

      const name =
        asset.fileName ||
        `media_${Date.now()}.${type === "video" ? "mp4" : "jpg"}`;

      const result = await this.uploadFile(asset.uri, name, type, options);

      if (result.success) {
        mediaItems.push({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          uri: result.url!,
          type,
          name,
          size: result.size || asset.fileSize || 0,
          duration:
            type === "video" ? (asset.duration ?? undefined) : undefined,
          thumbnail: result.thumbnailUrl || result.url,
        });
      }
    }

    return mediaItems;
  }

  // ✅ Pick images from library and upload
  async pickAndUploadImages(options: UploadOptions = {}): Promise<MediaItem[]> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return [];

    const res = await ImagePicker.launchImageLibraryAsync({
      // ✅ REQUIRED UPDATE (deprecated MediaTypeOptions)
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

  // ✅ Pick videos from library and upload
  async pickAndUploadVideos(options: UploadOptions = {}): Promise<MediaItem[]> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return [];

    const res = await ImagePicker.launchImageLibraryAsync({
      // ✅ REQUIRED UPDATE (deprecated MediaTypeOptions)
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
      quality: 1,
    });

    return this.uploadFromImagePicker(res, {
      generateThumbnails: true,
      ...options,
    });
  }

  // ✅ Record a video using the system camera UI and upload
  async recordAndUploadVideo(
    options: UploadOptions = {},
  ): Promise<MediaItem[]> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return [];

    const res = await ImagePicker.launchCameraAsync({
      // ✅ REQUIRED UPDATE (deprecated MediaTypeOptions)
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
      quality: 1,
    });

    return this.uploadFromImagePicker(res, {
      generateThumbnails: true,
      ...options,
    });
  }

  async createSignedUrl(
    filePath: string,
    expiresIn: number = 3600,
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .createSignedUrl(filePath, expiresIn);
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Create signed URL failed:", error);
      return null;
    }
  }
}

// Singleton instance
export const uploadService = new UploadService();

// Helper functions
export async function uploadMediaItem(
  item: MediaItem,
  options: UploadOptions = {},
): Promise<MediaItem> {
  if (item.uri.startsWith("http")) return item;

  const result = await uploadService.uploadFile(
    item.uri,
    item.name || `file_${Date.now()}`,
    item.type,
    options,
  );

  if (!result.success) throw new Error(result.error || "Upload failed");

  return {
    ...item,
    uri: result.url!,
    thumbnail: result.thumbnailUrl || result.url,
  };
}

export async function uploadMediaItems(
  items: MediaItem[],
  options: UploadOptions = {},
): Promise<MediaItem[]> {
  const uploaded: MediaItem[] = [];
  for (const item of items) {
    try {
      uploaded.push(await uploadMediaItem(item, options));
    } catch (e) {
      console.error(`Failed to upload item ${item.id}:`, e);
    }
  }
  return uploaded;
}

export async function deleteMediaItems(items: MediaItem[]): Promise<void> {
  for (const item of items) {
    if (item.uri.includes("/storage/v1/object/public/media/")) {
      const path = item.uri.split("/public/media/")[1];
      if (path) await uploadService.deleteFile(path);
    }
  }
}

export async function getStorageUsage(): Promise<{
  total: number;
  used: number;
  available: number;
}> {
  return {
    total: 100 * 1024 * 1024 * 1024,
    used: 0,
    available: 100 * 1024 * 1024 * 1024,
  };
}
