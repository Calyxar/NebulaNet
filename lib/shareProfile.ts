// lib/shareProfile.ts — COMPLETED (canonical /u links + no lowercasing + clean message)
import { Platform, Share } from "react-native";

type ShareProfileArgs = {
  username?: string | null;
  userId: string;
  fullName?: string | null;
};

const WEB_BASE = "https://nebulanet.space";

function safeSlug(input: string) {
  // ✅ URL-safe WITHOUT changing case (lowercasing can break usernames)
  return encodeURIComponent(input.trim());
}

/**
 * ✅ Canonical public profile URL
 * - Primary: https://nebulanet.space/u/<username>
 * - Fallback: https://nebulanet.space/u/id/<userId>
 *
 * This keeps the web surface consistent and avoids 404s from multiple patterns.
 */
export function buildProfileShareUrl({
  username,
  userId,
}: {
  username?: string | null;
  userId: string;
}) {
  const u = username?.trim();
  if (u) return `${WEB_BASE}/u/${safeSlug(u)}`;
  return `${WEB_BASE}/u/id/${encodeURIComponent(userId)}`;
}

/**
 * Opens the OS share sheet with a clean message + web URL.
 * Returns the URL for optional analytics or "Copied" fallback UI.
 */
export async function shareProfileLink({
  username,
  userId,
  fullName,
}: ShareProfileArgs) {
  const url = buildProfileShareUrl({ username, userId });

  const displayName =
    fullName?.trim() || (username ? `@${username.trim()}` : "this profile");

  const message = `Check out ${displayName} on NebulaNet 👀\n${url}`;

  // iOS prefers `url` field; Android prefers message. Provide both.
  await Share.share(
    Platform.select({
      ios: { url, message },
      android: { message },
      default: { message },
    })!,
  );

  return url;
}
