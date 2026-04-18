// lib/types/attachments.ts

export type AttachmentMediaType = "image" | "video" | "audio" | "file" | "gif";

export interface ChatAttachment {
  url: string;
  type: AttachmentMediaType;
  name: string;
  storagePath: string;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number; // for audio/video, in seconds
  thumbnailUrl?: string; // for video
}

export interface PostAttachment {
  url: string;
  type: AttachmentMediaType;
  name: string;
  storagePath: string;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
}

export interface StoryAttachment {
  url: string;
  type: Extract<AttachmentMediaType, "image" | "video">;
  storagePath: string;
  width?: number;
  height?: number;
  duration?: number;
}

// Generic upload result returned after a file is uploaded to Firebase Storage
export interface UploadedAttachment {
  url: string;
  storagePath: string;
  type: AttachmentMediaType;
  name: string;
  size?: number;
  mimeType?: string;
}

// Used in upload progress tracking
export interface AttachmentUploadState {
  localUri: string;
  progress: number; // 0–100
  status: "pending" | "uploading" | "done" | "error";
  result?: UploadedAttachment;
  error?: string;
}
