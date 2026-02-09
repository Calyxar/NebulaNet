import { Platform, Share } from "react-native";

type ShareProfileArgs = {
  username?: string | null;
  userId: string;
  fullName?: string | null;
};

const WEB_BASE = "https://nebulanet.space";

function safeSlug(input: string) {
  // keep it URL-safe and predictable
  return encodeURIComponent(input.trim().toLowerCase());
}

export function buildProfileShareUrl({
  username,
  userId,
}: {
  username?: string | null;
  userId: string;
}) {
  if (username && username.trim().length > 0) {
    return `${WEB_BASE}/user/${safeSlug(username)}`;
  }
  // fallback if no username yet
  return `${WEB_BASE}/u/${encodeURIComponent(userId)}`;
}

export async function shareProfileLink({
  username,
  userId,
  fullName,
}: ShareProfileArgs) {
  const url = buildProfileShareUrl({ username, userId });
  const displayName = (fullName || username || "this profile").toString();

  const message = `Check out ${displayName} on NebulaNet 👀\n${url}`;

  // iOS likes url field, Android likes message. Provide both.
  await Share.share(
    Platform.select({
      ios: { url, message },
      android: { message },
      default: { message },
    })!,
  );

  return url; // handy for analytics or “Copied” fallback
}
