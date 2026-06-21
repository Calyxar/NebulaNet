// components/media/MediaViewer.tsx ✅ NEW
// Twitter/Instagram-style fullscreen media viewer.
// Swipe horizontally between all media in the discovery grid without
// going back to the grid each time.

import VideoPlayer from "@/components/media/VideoPlayer";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    type ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export type ViewerMediaItem = {
  id: string; // post id
  media_url: string;
  is_video: boolean;
};

interface Props {
  visible: boolean;
  items: ViewerMediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function MediaViewer({
  visible,
  items,
  initialIndex,
  onClose,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const listRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const openPost = useCallback(() => {
    const item = items[activeIndex];
    if (item) {
      onClose();
      router.push(`/post/${item.id}` as any);
    }
  }, [items, activeIndex, onClose]);

  const renderItem = useCallback(
    ({ item }: { item: ViewerMediaItem }) => (
      <View style={styles.page}>
        {item.is_video ? (
          <VideoPlayer uri={item.media_url} style={styles.media} autoPlay />
        ) : (
          <Image
            source={{ uri: item.media_url }}
            style={styles.media}
            resizeMode="contain"
          />
        )}
      </View>
    ),
    [],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_W,
      offset: SCREEN_W * index,
      index,
    }),
    [],
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container}>
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={getItemLayout}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          windowSize={3}
          maxToRenderPerBatch={3}
          removeClippedSubviews
        />

        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.counter}>
              {activeIndex + 1} / {items.length}
            </Text>

            <TouchableOpacity
              style={styles.viewPostBtn}
              onPress={openPost}
              activeOpacity={0.85}
            >
              <Text style={styles.viewPostText}>View Post</Text>
              <Ionicons name="chevron-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  page: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: "center",
    justifyContent: "center",
  },
  media: { width: SCREEN_W, height: SCREEN_H },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  viewPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  viewPostText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
