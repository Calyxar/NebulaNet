// lib/share.ts
import * as Clipboard from "expo-clipboard";
import { Alert, Platform, Share as RNShare } from "react-native";

// Remove these imports if they don't exist in supabase.ts
// import {
//     generateCommunityLink,
//     generatePostLink,
//     generateUserLink,
//     incrementShareCount,
// } from "./supabase";

// Instead, define them locally:
export const generatePostLink = (postId: string): string => {
  return `https://nebulanet.space/post/${postId}`;
};

export const generateUserLink = (username: string): string => {
  return `https://nebulanet.space/user/${username}`;
};

export const generateCommunityLink = (slug: string): string => {
  return `https://nebulanet.space/community/${slug}`;
};

// Mock incrementShareCount function - replace with real implementation
const incrementShareCount = async (postId: string): Promise<void> => {
  try {
    // TODO: Replace with actual Supabase call
    // Example:
    // const { error } = await supabase
    //   .from('posts')
    //   .update({ share_count: supabase.sql('share_count + 1') })
    //   .eq('id', postId);

    console.log(`Share count incremented for post ${postId}`);
  } catch (error) {
    console.error("Error incrementing share count:", error);
  }
};

interface ShareOptions {
  title?: string;
  message?: string;
  url?: string;
}

// Main share function
export async function shareContent(options: ShareOptions) {
  try {
    const result = await RNShare.share({
      title: options.title || "Check this out on NebulaNet",
      message: options.message || "",
      url: options.url || "https://nebulanet.space",
    });

    return result;
  } catch (error: any) {
    console.error("Error sharing:", error);
    throw error;
  }
}

// Share a post
export async function sharePost(postData: {
  id: string;
  title?: string;
  content: string;
  author: { username: string; name: string };
  community?: { name: string; slug: string };
}) {
  try {
    const postLink = generatePostLink(postData.id);
    const message = `${postData.author.name}: ${postData.title || postData.content.substring(0, 100)}...\n\n${postData.community ? `Posted in ${postData.community.name}` : ""}`;

    const result = await shareContent({
      title: `Post by ${postData.author.name} | NebulaNet`,
      message: message,
      url: postLink,
    });

    // Increment share count in database
    if (result.action === RNShare.sharedAction) {
      await incrementShareCount(postData.id);
    }

    return result;
  } catch (error) {
    console.error("Error sharing post:", error);
    throw error;
  }
}

// Share to chat (copies link to clipboard with message)
export async function shareToChat(postData: {
  id: string;
  title?: string;
  content: string;
  author: { username: string; name: string };
}) {
  try {
    const postLink = generatePostLink(postData.id);
    const message = `Check out this post by ${postData.author.name}:\n${postData.title || postData.content.substring(0, 100)}...\n\n${postLink}`;

    await Clipboard.setStringAsync(message);

    Alert.alert(
      "Copied to Clipboard",
      "Post link has been copied. You can now paste it in any chat.",
      [{ text: "OK" }],
    );

    // Increment share count
    await incrementShareCount(postData.id);

    return true;
  } catch (error) {
    console.error("Error sharing to chat:", error);
    Alert.alert("Error", "Failed to copy to clipboard");
    throw error;
  }
}

// Copy link to clipboard
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

// Share user profile
export async function shareProfile(userData: {
  username: string;
  name: string;
  bio?: string;
}) {
  try {
    const profileLink = generateUserLink(userData.username);
    const message = `Check out ${userData.name}'s profile on NebulaNet:\n${userData.bio ? userData.bio.substring(0, 100) + "..." : ""}`;

    return await shareContent({
      title: `${userData.name} | NebulaNet`,
      message: message,
      url: profileLink,
    });
  } catch (error) {
    console.error("Error sharing profile:", error);
    throw error;
  }
}

// Share community
export async function shareCommunity(communityData: {
  slug: string;
  name: string;
  description?: string;
}) {
  try {
    const communityLink = generateCommunityLink(communityData.slug);
    const message = `Join ${communityData.name} on NebulaNet:\n${communityData.description ? communityData.description.substring(0, 100) + "..." : ""}`;

    return await shareContent({
      title: `${communityData.name} | NebulaNet`,
      message: message,
      url: communityLink,
    });
  } catch (error) {
    console.error("Error sharing community:", error);
    throw error;
  }
}

// Share via system share sheet with more options
export async function shareWithOptions(postData: {
  id: string;
  title?: string;
  content: string;
  author: { username: string; name: string };
}) {
  try {
    const postLink = generatePostLink(postData.id);
    const message = `${postData.author.name}: ${postData.title || postData.content.substring(0, 100)}...`;

    if (Platform.OS === "ios") {
      // On iOS, use the system share sheet
      const result = await RNShare.share({
        message: `${message}\n\n${postLink}`,
        url: postLink, // iOS will show app icons for URLs
      });

      if (result.action === RNShare.sharedAction) {
        await incrementShareCount(postData.id);
      }

      return result;
    } else {
      // On Android, provide more options
      const action = await new Promise<string>((resolve) => {
        Alert.alert("Share Post", "How would you like to share?", [
          { text: "Share to Chat", onPress: () => resolve("chat") },
          { text: "Copy Link", onPress: () => resolve("copy") },
          { text: "Share via...", onPress: () => resolve("share") },
          { text: "Cancel", style: "cancel", onPress: () => resolve("cancel") },
        ]);
      });

      switch (action) {
        case "chat":
          return await shareToChat(postData);
        case "copy":
          await copyLink(postLink, "Post link");
          await incrementShareCount(postData.id);
          return { action: "copied" };
        case "share":
          const result = await sharePost(postData);
          return result;
        default:
          return { action: "cancelled" };
      }
    }
  } catch (error) {
    console.error("Error sharing with options:", error);
    throw error;
  }
}

// Check if URL is a NebulaNet link
export function isNebulaNetLink(url: string): boolean {
  return url.includes("nebulanet.space") || url.includes("nebulanet://");
}

// Parse NebulaNet link
export function parseNebulaNetLink(url: string): {
  type: "post" | "user" | "community" | "unknown";
  id: string;
} {
  try {
    const urlObj = new URL(url);

    if (url.includes("nebulanet://")) {
      // Deep link
      const path = url.replace("nebulanet://", "");
      const [type, id] = path.split("/");
      return { type: type as any, id };
    }

    if (url.includes("nebulanet.space")) {
      const path = urlObj.pathname;
      if (path.startsWith("/post/")) {
        return { type: "post", id: path.replace("/post/", "") };
      } else if (path.startsWith("/user/")) {
        return { type: "user", id: path.replace("/user/", "") };
      } else if (path.startsWith("/community/")) {
        return { type: "community", id: path.replace("/community/", "") };
      }
    }

    return { type: "unknown", id: "" };
  } catch {
    return { type: "unknown", id: "" };
  }
}
