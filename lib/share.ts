// lib/share.ts — UPDATED ✅
// ✅ FIXED: shareWithOptions no longer uses Alert.alert on Android
//           (was overlapping phone navigation controls)
//           Now uses direct native Share sheet on both platforms
// ✅ FIXED: incrementShareCount only called once per share action

import { db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";
import * as Clipboard from "expo-clipboard";
import { Alert, Platform, Share as RNShare } from "react-native";

/* -------------------- LINK GENERATORS -------------------- */

export const generatePostLink = (postId: string): string => {
  return `https://nebulanet.space/post/${postId}`;
};

export const generateUserLink = (username: string): string => {
  return `https://nebulanet.space/u/${encodeURIComponent(username.trim())}`;
};

export const generateCommunityLink = (slug: string): string => {
  return `https://nebulanet.space/community/${slug}`;
};

export const generateEventLink = (eventId: string): string => {
  return `https://nebulanet.space/event/${eventId}`;
};

/* -------------------- FIRESTORE SHARE COUNT -------------------- */

export const incrementShareCount = async (postId: string): Promise<void> => {
  try {
    await db
      .collection("posts")
      .doc(postId)
      .update({
        share_count: firestore.FieldValue.increment(1),
      });
  } catch (error) {
    console.error("Error incrementing share count:", error);
  }
};
interface ShareOptions {
  title?: string;
  message?: string;
  url?: string;
}

/* -------------------- BASE SHARE FUNCTION -------------------- */

export async function shareContent(options: ShareOptions) {
  try {
    const fullMessage =
      Platform.OS === "android" && options.url
        ? `${options.message || ""}\n\n${options.url}`.trim()
        : options.message || "";

    const result = await RNShare.share({
      title: options.title || "Check this out on NebulaNet",
      message: fullMessage,
      url: options.url || "https://nebulanet.space",
    });

    return result;
  } catch (error: any) {
    console.error("Error sharing:", error);
    throw error;
  }
}

/* -------------------- SHARE POST -------------------- */

export async function sharePost(postData: {
  id: string;
  title?: string;
  content: string;
  author: { username: string; name: string };
  community?: { name: string; slug: string };
}) {
  try {
    const postLink = generatePostLink(postData.id);
    const preview = postData.title || postData.content.substring(0, 100);
    const communityLine = postData.community
      ? `\nPosted in ${postData.community.name}`
      : "";

    const message = `${postData.author.name}: ${preview}...${communityLine}\n\n${postLink}`;

    const result = await shareContent({
      title: `Post by ${postData.author.name} | NebulaNet`,
      message,
      url: postLink,
    });

    if (result.action === RNShare.sharedAction) {
      await incrementShareCount(postData.id);
    }

    return result;
  } catch (error) {
    console.error("Error sharing post:", error);
    throw error;
  }
}

/* -------------------- SHARE TO CHAT -------------------- */

export async function shareToChat(postData: {
  id: string;
  title?: string;
  content: string;
  author: { username: string; name: string };
}) {
  try {
    const postLink = generatePostLink(postData.id);
    const message = `Check out this post by ${
      postData.author.name
    }:\n${postData.title || postData.content.substring(0, 100)}...\n\n${postLink}`;

    await Clipboard.setStringAsync(message);

    Alert.alert(
      "Copied to Clipboard",
      "Post link has been copied. You can now paste it in any chat.",
      [{ text: "OK" }],
    );

    await incrementShareCount(postData.id);
    return true;
  } catch (error) {
    console.error("Error sharing to chat:", error);
    Alert.alert("Error", "Failed to copy to clipboard");
    throw error;
  }
}

/* -------------------- COPY LINK -------------------- */

export async function copyLink(url: string, entityName: string = "Link") {
  try {
    await Clipboard.setStringAsync(url);
    Alert.alert(
      "Copied to Clipboard",
      `${entityName} has been copied to your clipboard`,
      [{ text: "OK" }],
    );
    return true;
  } catch (error) {
    console.error("Error copying link:", error);
    Alert.alert("Error", "Failed to copy link");
    throw error;
  }
}

/* -------------------- SHARE PROFILE -------------------- */

export async function shareProfile(userData: {
  username: string;
  name: string;
  bio?: string;
}) {
  try {
    const profileLink = generateUserLink(userData.username);
    const message = `Check out ${userData.name}'s profile on NebulaNet:\n${
      userData.bio ? userData.bio.substring(0, 100) + "..." : ""
    }\n\n${profileLink}`;

    return await shareContent({
      title: `${userData.name} | NebulaNet`,
      message,
      url: profileLink,
    });
  } catch (error) {
    console.error("Error sharing profile:", error);
    throw error;
  }
}

/* -------------------- SHARE COMMUNITY -------------------- */

export async function shareCommunity(communityData: {
  slug: string;
  name: string;
  description?: string;
}) {
  try {
    const communityLink = generateCommunityLink(communityData.slug);
    const message = `Join ${communityData.name} on NebulaNet:\n${
      communityData.description
        ? communityData.description.substring(0, 100) + "..."
        : ""
    }\n\n${communityLink}`;

    return await shareContent({
      title: `${communityData.name} | NebulaNet`,
      message,
      url: communityLink,
    });
  } catch (error) {
    console.error("Error sharing community:", error);
    throw error;
  }
}

/* -------------------- SHARE EVENT -------------------- */

export async function shareEvent(eventData: {
  id: string;
  title: string;
  description?: string;
  creator: { name: string };
}) {
  try {
    const eventLink = generateEventLink(eventData.id);
    const message = `${eventData.creator.name} invited you to ${eventData.title} on NebulaNet:\n${
      eventData.description
        ? eventData.description.substring(0, 100) + "..."
        : ""
    }\n\n${eventLink}`;

    return await shareContent({
      title: `${eventData.title} | NebulaNet`,
      message,
      url: eventLink,
    });
  } catch (error) {
    console.error("Error sharing event:", error);
    throw error;
  }
}

/* -------------------- SHARE WITH OPTIONS -------------------- */
// ✅ FIXED: No longer uses Alert.alert dialog on Android
//           Opens native share sheet directly — no Cancel button overlap
//           incrementShareCount called once here only
//           Callers (PostCard, post detail) must NOT call incrementShareCount again

export async function shareWithOptions(postData: {
  id: string;
  title?: string;
  content: string;
  author: { username: string; name: string };
}) {
  try {
    const postLink = generatePostLink(postData.id);
    const preview = postData.title || postData.content.substring(0, 100);
    const message = `${postData.author.name}: ${preview}...\n\n${postLink}`;

    const result = await RNShare.share({
      title: `Post by ${postData.author.name} | NebulaNet`,
      message,
      url: postLink, // iOS only
    });

    // ✅ Only increment if user actually shared (not dismissed)
    if (result.action === RNShare.sharedAction) {
      await incrementShareCount(postData.id);
    }

    return result;
  } catch (error) {
    console.error("Error sharing with options:", error);
    throw error;
  }
}

/* -------------------- LINK HELPERS -------------------- */

export function isNebulaNetLink(url: string): boolean {
  return url.includes("nebulanet.space") || url.includes("nebulanet://");
}

export function parseNebulaNetLink(url: string): {
  type: "post" | "user" | "community" | "event" | "unknown";
  id: string;
} {
  try {
    const urlObj = new URL(url);

    if (url.includes("nebulanet://")) {
      const path = url.replace("nebulanet://", "");
      const [type, id] = path.split("/");
      return { type: type as any, id };
    }

    if (url.includes("nebulanet.space")) {
      const path = urlObj.pathname;

      if (path.startsWith("/post/")) {
        return { type: "post", id: path.replace("/post/", "") };
      } else if (path.startsWith("/user/") || path.startsWith("/u/")) {
        const id = path.startsWith("/u/")
          ? path.replace("/u/", "")
          : path.replace("/user/", "");
        return { type: "user", id };
      } else if (path.startsWith("/community/")) {
        return { type: "community", id: path.replace("/community/", "") };
      } else if (path.startsWith("/event/")) {
        return { type: "event", id: path.replace("/event/", "") };
      }
    }

    return { type: "unknown", id: "" };
  } catch {
    return { type: "unknown", id: "" };
  }
}
