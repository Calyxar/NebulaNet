import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ImageViewing from "react-native-image-viewing";

interface Props {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, visible]);
  const handleSave = async () => {
    if (busy) return;

    setBusy(true);

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== "granted") {
        alert("Permission denied.");
        return;
      }

      const imageUrl = images[currentIndex];

      const fileUri = FileSystem.cacheDirectory + `image-${Date.now()}.jpg`;

      const download = await FileSystem.downloadAsync(imageUrl, fileUri);

      await MediaLibrary.saveToLibraryAsync(download.uri);

      await FileSystem.deleteAsync(download.uri, {
        idempotent: true,
      });

      alert("Image saved!");
    } catch (error) {
      console.error(error);
      alert("Couldn't save image.");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (busy) return;

    setBusy(true);

    try {
      const imageUrl = images[currentIndex];

      const fileUri = FileSystem.cacheDirectory + `share-${Date.now()}.jpg`;

      const download = await FileSystem.downloadAsync(imageUrl, fileUri);

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        alert("Sharing is not available on this device.");
        return;
      }

      await Sharing.shareAsync(download.uri);

      await FileSystem.deleteAsync(download.uri, {
        idempotent: true,
      });
    } catch (error) {
      console.error(error);
      alert("Couldn't share image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ImageViewing
        images={images.map((uri) => ({ uri }))}
        imageIndex={initialIndex}
        visible={visible}
        onImageIndexChange={setCurrentIndex}
        onRequestClose={onClose}
        presentationStyle="fullScreen"
        swipeToCloseEnabled
        doubleTapToZoomEnabled
        HeaderComponent={() => (
          <View style={styles.header}>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>

            <Text style={styles.counter}>
              {currentIndex + 1} / {images.length}
            </Text>

            <View style={{ width: 28 }} />
          </View>
        )}
        FooterComponent={() => (
          <View style={styles.bottomBar}>
            <Pressable
              style={styles.actionButton}
              onPress={handleShare}
              disabled={busy}
            >
              <Ionicons name="share-social-outline" size={24} color="#fff" />
              <Text style={styles.actionText}>Share</Text>
            </Pressable>

            <Pressable
              style={styles.actionButton}
              onPress={handleSave}
              disabled={busy}
            >
              <Ionicons name="download-outline" size={24} color="#fff" />
              <Text style={styles.actionText}>Save</Text>
            </Pressable>
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 56,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 100,
  },

  counter: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },

  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  actionButton: {
    alignItems: "center",
    paddingHorizontal: 24,
  },

  actionText: {
    color: "#fff",
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
  },
});
