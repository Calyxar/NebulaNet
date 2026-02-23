// components/user/Avatar.tsx — FIREBASE ✅

import { getDownloadURL, getStorage, ref } from "firebase/storage";
import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface AvatarProps {
  size: number;
  name: string;
  image?: string;
  online?: boolean;
  bucket?: string;
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

  const initials = useMemo(
    () =>
      name
        .split(" ")
        .map((w) => w.charAt(0))
        .join("")
        .toUpperCase()
        .substring(0, 2),
    [name],
  );

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

  useEffect(() => {
    let isMounted = true;
    setFailed(false);

    const run = async () => {
      if (!image) {
        setResolvedUri(null);
        return;
      }

      // Local file preview (e.g. just picked from camera roll)
      if (isLocalFile(image)) {
        setResolvedUri(image);
        return;
      }

      // Already a full public/download URL — use directly with cache-bust
      if (isProbablyUrl(image)) {
        const join = image.includes("?") ? "&" : "?";
        if (isMounted) setResolvedUri(`${image}${join}t=${Date.now()}`);
        return;
      }

      // Storage path — fetch Firebase download URL
      try {
        const storage = getStorage();
        const key = image.startsWith(stripPrefix)
          ? image.slice(stripPrefix.length)
          : image;
        // Full path in Firebase Storage: e.g. "avatars/userId/file.jpg"
        const fullPath = image.startsWith(stripPrefix)
          ? image
          : `${bucket}/${key}`;
        const url = await getDownloadURL(ref(storage, fullPath));
        if (isMounted) {
          const join = url.includes("?") ? "&" : "?";
          setResolvedUri(`${url}${join}t=${Date.now()}`);
        }
      } catch (e) {
        console.log("Avatar download URL error:", e);
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
  container: { position: "relative" },
  avatar: { overflow: "hidden" },
  initialsAvatar: { justifyContent: "center", alignItems: "center" },
  initials: { color: "#fff", fontWeight: "bold" },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#34C759",
    borderColor: "#fff",
  },
});
