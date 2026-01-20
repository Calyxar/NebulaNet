// lib/uploads.ts
import { MediaItem, MediaType } from '@/components/media/MediaUpload';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Platform } from 'react-native';
import { supabase } from './supabase';

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
  private bucket = 'media';
  
  constructor(bucket?: string) {
    if (bucket) this.bucket = bucket;
  }

  // Get MIME type from file extension
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      // Videos
      mp4: 'video/mp4',
      mov: 'video/mov',
      avi: 'video/avi',
      mkv: 'video/x-matroska',
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
    };
    
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  // Generate unique filename
  private generateFilename(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = originalName.split('.').pop();
    return `${userId}/${timestamp}-${random}.${ext}`;
  }

  // Compress image
  private async compressImage(
    uri: string, 
    options: UploadOptions = {}
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
          compress: options.quality || 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false,
        }
      );
      
      return result.uri;
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
      return uri;
    }
  }

  // Generate thumbnail for image
  private async generateImageThumbnail(
    uri: string, 
    size: number = 300
  ): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: size,
              height: size,
            },
          },
        ],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: false,
        }
      );
      
      return result.uri;
    } catch (error) {
      console.warn('Thumbnail generation failed:', error);
      return uri;
    }
  }

  // Generate thumbnail for video
  private async generateVideoThumbnail(uri: string): Promise<string> {
    try {
      const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(
        uri,
        {
          time: 1000, // 1 second in
          quality: 0.7,
        }
      );
      
      return thumbnailUri;
    } catch (error) {
      console.warn('Video thumbnail generation failed:', error);
      return uri;
    }
  }

  // Upload file to Supabase Storage
  async uploadFile(
    uri: string, 
    originalName: string,
    type: MediaType,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check file size
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      if (fileInfo.size && fileInfo.size > MAX_FILE_SIZE) {
        throw new Error(`File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      // Read file as blob
      const fileBlob = await this.uriToBlob(uri);
      const mimeType = this.getMimeType(originalName);
      
      // Generate filename
      const filename = this.generateFilename(originalName, user.id);
      const filePath = `${type}/${filename}`;

      // Upload main file
      const { error: uploadError } = await supabase.storage
        .from(this.bucket)
        .upload(filePath, fileBlob, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.bucket)
        .getPublicUrl(filePath);

      let thumbnailUrl: string | undefined;

      // Generate thumbnail if needed
      if (options.generateThumbnails) {
        if (type === 'image') {
          const compressedUri = await this.compressImage(uri, options);
          const thumbnailUri = await this.generateImageThumbnail(compressedUri, options.thumbnailSize);
          const thumbnailBlob = await this.uriToBlob(thumbnailUri);
          
          const thumbPath = `thumbnails/${filename}`;
          
          await supabase.storage
            .from(this.bucket)
            .upload(thumbPath, thumbnailBlob, {
              contentType: 'image/jpeg',
            });

          const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
            .from(this.bucket)
            .getPublicUrl(thumbPath);
          
          thumbnailUrl = thumbPublicUrl;
        } else if (type === 'video') {
          const thumbnailUri = await this.generateVideoThumbnail(uri);
          const thumbnailBlob = await this.uriToBlob(thumbnailUri);
          
          const thumbPath = `thumbnails/${filename.replace(/\.[^/.]+$/, '')}.jpg`;
          
          await supabase.storage
            .from(this.bucket)
            .upload(thumbPath, thumbnailBlob, {
              contentType: 'image/jpeg',
            });

          const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
            .from(this.bucket)
            .getPublicUrl(thumbPath);
          
          thumbnailUrl = thumbPublicUrl;
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
      console.error('Upload failed:', error);
      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }
  }

  // Convert URI to Blob
 private async uriToBlob(uri: string): Promise<Blob> {
  if (Platform.OS === 'web') {
    // For web, fetch the file
    const response = await fetch(uri);
    return await response.blob();
  } else {
    // For mobile, use base64 directly without EncodingType enum
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any, // Type assertion
    });
    
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray]);
  }
}
  // Upload multiple files
  async uploadMultiple(
    files: { uri: string; name: string; type: MediaType }[],
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    for (const file of files) {
      const result = await this.uploadFile(file.uri, file.name, file.type, options);
      results.push(result);
    }
    
    return results;
  }

  // Delete file
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.bucket)
        .remove([filePath]);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  }

  // Get file info
  async getFileInfo(filePath: string): Promise<any> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .list('', {
          search: filePath,
        });
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Get file info failed:', error);
      return null;
    }
  }

  // List files in a folder
  async listFiles(folder: string = ''): Promise<any[]> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .list(folder);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('List files failed:', error);
      return [];
    }
  }

  // Upload from image picker
  async uploadFromImagePicker(
    pickerResult: ImagePicker.ImagePickerResult,
    options: UploadOptions = {}
  ): Promise<MediaItem[]> {
    if (pickerResult.canceled) {
      return [];
    }

    const mediaItems: MediaItem[] = [];
    
    for (const asset of pickerResult.assets) {
      const type: MediaType = asset.type === 'video' ? 'video' : 'image';
      
      const result = await this.uploadFile(
        asset.uri,
        asset.fileName || `media_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`,
        type,
        options
      );

      if (result.success) {
        mediaItems.push({
          id: Date.now().toString(),
          uri: result.url!,
          type,
          name: asset.fileName || `media_${Date.now()}`,
          size: result.size || asset.fileSize || 0,
          duration: type === 'video' ? (asset.duration ?? undefined) : undefined,
          thumbnail: result.thumbnailUrl || result.url,
        });
      }
    }
    
    return mediaItems;
  }

  // Create signed URL for temporary access
  async createSignedUrl(
    filePath: string,
    expiresIn: number = 3600 // 1 hour
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .createSignedUrl(filePath, expiresIn);
      
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Create signed URL failed:', error);
      return null;
    }
  }
}

// Singleton instance
export const uploadService = new UploadService();

// Helper functions
export async function uploadMediaItem(
  item: MediaItem,
  options: UploadOptions = {}
): Promise<MediaItem> {
  // If already has a URL (already uploaded), return as is
  if (item.uri.startsWith('http')) {
    return item;
  }

  const result = await uploadService.uploadFile(
    item.uri,
    item.name || `file_${Date.now()}`,
    item.type,
    options
  );

  if (result.success) {
    return {
      ...item,
      uri: result.url!,
      thumbnail: result.thumbnailUrl || result.url,
    };
  } else {
    throw new Error(result.error || 'Upload failed');
  }
}

export async function uploadMediaItems(
  items: MediaItem[],
  options: UploadOptions = {}
): Promise<MediaItem[]> {
  const uploadedItems: MediaItem[] = [];
  
  for (const item of items) {
    try {
      const uploaded = await uploadMediaItem(item, options);
      uploadedItems.push(uploaded);
    } catch (error) {
      console.error(`Failed to upload item ${item.id}:`, error);
    }
  }
  
  return uploadedItems;
}

// Delete media items
export async function deleteMediaItems(items: MediaItem[]): Promise<void> {
  for (const item of items) {
    if (item.uri.includes('supabase.co/storage/v1/object/public/media/')) {
      const path = item.uri.split('/public/media/')[1];
      await uploadService.deleteFile(path);
    }
  }
}

// Get storage usage
export async function getStorageUsage(): Promise<{
  total: number;
  used: number;
  available: number;
}> {
  // Note: Supabase doesn't provide direct storage usage API
  // You might need to track this manually in your database
  return {
    total: 100 * 1024 * 1024 * 1024, // 100GB (example)
    used: 0,
    available: 100 * 1024 * 1024 * 1024,
  };
}