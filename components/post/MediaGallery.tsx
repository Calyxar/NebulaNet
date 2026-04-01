// components/post/MediaGallery.tsx — FIXED ✅
// Real images rendered + pinch-to-zoom via react-native-image-viewing

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ImageViewing from "react-native-image-viewing";

interface MediaGalleryProps {
  media: string[];
  maxVisible?: number;
  onMediaPress?: (index: number) => void;
}

const isVideoUrl = (url: string) =>
  ["mp4", "mov", "m4v", "webm", "mkv", "avi"].some((e) =>
    url.split("?")[0].toLowerCase().endsWith(`.${e}`),
  );

export default function MediaGallery({
  media,
  maxVisible = 4,
  onMediaPress,
}: MediaGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);

  if (!media || media.length === 0) return null;

  const visibleMedia = media.slice(0, maxVisible);
  const remainingCount = media.length - maxVisible;

  // Only pass image URLs (not videos) to the lightbox
  const imageUris = media
    .filter((url) => !isVideoUrl(url))
    .map((uri) => ({ uri }));

  const handlePress = (index: number) => {
    onMediaPress?.(index);
    const url = media[index];
    if (isVideoUrl(url)) return;
    const imgIndex =
      media.slice(0, index + 1).filter((u) => !isVideoUrl(u)).length - 1;
    setLightboxIndex(Math.max(0, imgIndex));
    setLightboxVisible(true);
  };

  const getGridStyle = () => {
    switch (visibleMedia.length) {
      case 1:
        return styles.singleGrid;
      case 2:
        return styles.doubleGrid;
      case 3:
        return styles.tripleGrid;
      default:
        return styles.quadGrid;
    }
  };

  return (
    <>
      <View style={[styles.container, getGridStyle()]}>
        {visibleMedia.map((item, index) => {
          const isVid = isVideoUrl(item);
          const isLast = index === maxVisible - 1 && remainingCount > 0;

          return (
            <TouchableOpacity
              key={index}
              style={styles.mediaItem}
              onPress={() => handlePress(index)}
              activeOpacity={0.85}
            >
              <View style={styles.mediaContainer}>
                <Image
                  source={{ uri: item }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />

                {/* Video play icon */}
                {isVid && (
                  <View style={styles.videoOverlay}>
                    <Ionicons name="play-circle" size={36} color="#fff" />
                  </View>
                )}

                {/* "+N more" overlay */}
                {isLast && (
                  <View style={styles.overlay}>
                    <Text style={styles.overlayText}>+{remainingCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Pinch-to-zoom fullscreen lightbox */}
      {imageUris.length > 0 && (
        <ImageViewing
          images={imageUris}
          imageIndex={lightboxIndex}
          visible={lightboxVisible}
          onRequestClose={() => setLightboxVisible(false)}
          swipeToCloseEnabled
          doubleTapToZoomEnabled
          presentationStyle="overFullScreen"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  singleGrid: { height: 300 },
  doubleGrid: { height: 200, flexDirection: "row" },
  tripleGrid: { height: 200, flexDirection: "row", flexWrap: "wrap" },
  quadGrid: { height: 200, flexDirection: "row", flexWrap: "wrap" },
  mediaItem: { flex: 1, margin: 1 },
  mediaContainer: {
    flex: 1,
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  mediaImage: { flex: 1, width: "100%", height: "100%" },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: { fontSize: 24, fontWeight: "bold", color: "#fff" },
});
