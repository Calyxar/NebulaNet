// utils/detectLanguage.ts ✅
// Uses eld static small import — Metro-compatible (no dynamic imports)
// npm install eld

import { eld } from "eld/small";

const SUPPORTED = new Set(["en", "es", "fr", "de", "zh", "ja", "ko", "ru", "ar", "pt", "it", "nl"]);

/**
 * Detects the language of a given text string.
 * Returns a supported language code (e.g. "en", "es") or null if unknown/too short.
 */
export function detectLanguage(text: string): string | null {
  if (!text || text.trim().length < 20) return null;
  try {
    const result = eld.detect(text.trim());
    if (!result?.language) return null;
    const base = result.language.split("-")[0].toLowerCase();
    return SUPPORTED.has(base) ? base : null;
  } catch {
    return null;
  }
}