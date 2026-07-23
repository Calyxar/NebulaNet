// utils/format.ts ✅ COMPLETE
// Every function here is required by utils/index.ts's re-export list.
// formatDate is unchanged from what you already have — everything else
// was missing entirely.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ── Case conversion ──────────────────────────────────────────────────────

export function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function snakeToCamelCase(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

// ── Strings ───────────────────────────────────────────────────────────────

export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = "…",
): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + suffix;
}

export function generateRandomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function extractHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z0-9_]+/g) ?? [];
  return Array.from(new Set(matches.map((h) => h.slice(1).toLowerCase())));
}

export function extractMentions(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/@[a-zA-Z0-9_.]+/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.slice(1))));
}

// Splits text into plain-text and link segments so a caller can render
// tappable links without a full HTML/markdown renderer.
export function formatTextWithLinks(
  text: string,
): { type: "text" | "link"; value: string }[] {
  if (!text) return [];
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlPattern);
  return parts
    .filter((p) => p.length > 0)
    .map((p) => ({
      type: urlPattern.test(p) ? "link" : "text",
      value: p,
    }));
}

// ── Numbers / currency / duration / file size ───────────────────────────

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

export function formatCurrency(
  amount: number,
  currency: string = "USD",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// ── Dates ─────────────────────────────────────────────────────────────────

// Date formatting — Twitter/Bluesky style.
// <60s: "now" · <60m: "Xm" · <24h: "Xh" · <7d: "Xd"
// <~12mo same year: "Xmo" · older or different year: absolute date
// ("Jun 22" same year, "Jun 22, 2024" different year)
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) return "now";
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInHours < 24) return `${diffInHours}h`;
  if (diffInDays < 7) return `${diffInDays}d`;

  // Beyond a week, switch to calendar-month math (not 30-day buckets) so
  // "1mo" lines up with an actual month boundary the way Twitter/Bluesky do.
  const monthsDiff =
    (now.getFullYear() - d.getFullYear()) * 12 +
    (now.getMonth() - d.getMonth()) -
    (now.getDate() < d.getDate() ? 1 : 0);

  const sameYear = now.getFullYear() === d.getFullYear();

  if (monthsDiff < 1) {
    // Still within ~a month but past 7 days — show weeks, matching
    // Twitter/Bluesky which use "Xw" in this window.
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w`;
  }

  if (monthsDiff < 12 && sameYear) {
    return `${monthsDiff}mo`;
  }

  // Older than ~a year, or crossed into a different calendar year:
  // switch to an absolute date instead of a relative one.
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatFullDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

// ── Color ─────────────────────────────────────────────────────────────────

export function hexToRgba(hex: string, alpha: number = 1): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Returns "#000000" or "#FFFFFF" — whichever contrasts better against the
// given background color, using standard relative-luminance weighting.
export function getContrastColor(hexColor: string): string {
  const clean = hexColor.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

// ── URLs ──────────────────────────────────────────────────────────────────

export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function getMediaTypeFromUrl(
  url: string,
): "image" | "video" | "gif" | "unknown" {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".gif")) return "gif";
  if (
    ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
      clean.endsWith(`.${e}`),
    )
  ) {
    return "video";
  }
  if (["jpg", "jpeg", "png", "webp"].some((e) => clean.endsWith(`.${e}`))) {
    return "image";
  }
  return "unknown";
}

// ── Validation ────────────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

// Minimum: 8 chars, at least one letter and one number.
export function isValidPassword(password: string): boolean {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password);
}

// ── Platform ──────────────────────────────────────────────────────────────

export const isiOS = Platform.OS === "ios";
export const isAndroid = Platform.OS === "android";
export const isMobile = Platform.OS === "ios" || Platform.OS === "android";
export const isDesktop = !isMobile;

// ── Storage (AsyncStorage wrappers) ─────────────────────────────────────

export async function getStorageItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setStorageItem(
  key: string,
  value: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Best-effort — storage failures shouldn't crash the caller.
  }
}

export async function removeStorageItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Best-effort.
  }
}

// ── Objects / arrays ──────────────────────────────────────────────────────

export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
}

export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

export function mergeObjects<T extends object>(...objs: Partial<T>[]): T {
  return Object.assign({}, ...objs) as T;
}

export function deepClone<T>(obj: T): T {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function uniqueArray<T>(arr: T[], keyFn?: (item: T) => unknown): T[] {
  if (!keyFn) return Array.from(new Set(arr));
  const seen = new Set<unknown>();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Functions ─────────────────────────────────────────────────────────────

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= wait) {
      lastCall = now;
      fn(...args);
    }
  };
}
