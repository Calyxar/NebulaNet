import { supabase } from "@/lib/supabase";
import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface AvatarProps {
  size: number;
  name: string;

  /**
   * Can be:
   * - full URL (https://...)
   * - local file URI (file://...)
   * - storage key/path (ex: "userId/123.jpg" or "avatars/userId/123.jpg")
   */
  image?: string;

  online?: boolean;

  /**
   * If your bucket name differs, change this default.
   * This must match supabase.storage.from("<bucket>")
   */
  bucket?: string;

  /**
   * If your app stores "avatars/<userId>/<file>.jpg" as the key,
   * set stripPrefix="avatars/" so we can sign correctly.
   */
  stripPrefix?: string;
}

function isProbablyUrl(s: string) {
  return s.startsWith("http://") || s.startsWith("https://");
}

function isLocalFile(s: string) {
  return s.startsWith("file://") || s.startsWith("content://");
}

export default function Avatar({
  size,
  name,
  image,
  online = false,
  bucket = "avatars",
  stripPrefix = "avatars/",
}: AvatarProps) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const initials = useMemo(() => {
    return name
      .split(" ")
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }, [name]);

  const color = useMemo(() => {
    const colors = [
      "#007AFF",
      "#34C759",
      "#FF9500",
      "#FF3B30",
      "#AF52DE",
      "#FF2D55",
      "#5856D6",
      "#FFCC00",
      "#5AC8FA",
      "#FF9500",
    ];
    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }, [name]);

  // resolve `image` into something displayable:
  // - direct url -> use it (cache-busted)
  // - local file -> use it
  // - storage key -> signed url
  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setFailed(false);

      if (!image) {
        setResolvedUri(null);
        return;
      }

      // local preview (picked image)
      if (isLocalFile(image)) {
        setResolvedUri(image);
        return;
      }

      // already a full URL (public)
      if (isProbablyUrl(image)) {
        // cache-bust so new avatars show immediately
        const join = image.includes("?") ? "&" : "?";
        setResolvedUri(`${image}${join}t=${Date.now()}`);
        return;
      }

      // Otherwise treat as a storage key
      // If stored with "avatars/..." prefix, strip it
      const key = image.startsWith(stripPrefix)
        ? image.slice(stripPrefix.length)
        : image;

      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(key, 60 * 60); // 1 hour

        if (error) throw error;

        if (isMounted) {
          const signed = data?.signedUrl ?? null;
          if (signed) {
            const join = signed.includes("?") ? "&" : "?";
            setResolvedUri(`${signed}${join}t=${Date.now()}`);
          } else {
            setResolvedUri(null);
          }
        }
      } catch (e) {
        console.log("Avatar signed URL error:", e);
        if (isMounted) setResolvedUri(null);
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [image, bucket, stripPrefix]);

  const showImage = !!resolvedUri && !failed;

  return (
    <View style={styles.container}>
      {showImage ? (
        <Image
          source={{ uri: resolvedUri! }}
          onError={() => setFailed(true)}
          style={[
            styles.avatar,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.avatar,
            styles.initialsAvatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.35 }]}>
            {initials}
          </Text>
        </View>
      )}

      {online && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: (size * 0.3) / 2,
              borderWidth: size * 0.05,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  avatar: {
    overflow: "hidden",
  },
  initialsAvatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "#fff",
    fontWeight: "bold",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#34C759",
    borderColor: "#fff",
  },
});
