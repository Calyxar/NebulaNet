// components/media/MediaViewer.tsx ✅ REBUILT
// Twitter/X-style fullscreen media viewer.
// Swipe horizontally between media items AND see post context
// (author, caption, like/comment/repost counts) without leaving the viewer.

import VideoPlayer from "@/components/media/VideoPlayer";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useQuery } from "@tanstack/react-query";
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
  id: string;
  media_url: string;
  is_video: boolean;
};

type PostContext = {
  content: string | null;
  like_count: number;
  comment_count: number;
  repost_count: number;
  share_count: number;
  user: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

async function fetchPostContext(postId: string): Promise<PostContext | null> {
  const snap = await firestore().collection("posts").doc(postId).get();
  if (!snap.exists()) return null;
  const d = snap.data() as any;
  return {
    content: d.content ?? null,
    like_count: d.like_count ?? 0,
    comment_count: d.comment_count ?? 0,
    repost_count: d.repost_count ?? 0,
    share_count: d.share_count ?? 0,
    user: d.user
      ? {
          username: d.user.username ?? null,
          full_name: d.user.full_name ?? null,
          avatar_url: d.user.avatar_url ?? null,
        }
      : null,
  };
}

interface Props {
  visible: boolean;
  items: ViewerMediaItem[];
  initialIndex: number;
  onClose: () => void;
}

function ViewerPage({ item }: { item: ViewerMediaItem }) {
  const { data: post } = useQuery({
    queryKey: ["viewer-post-context", item.id],
    queryFn: () => fetchPostContext(item.id),
    staleTime: 60_000,
  });

  const author = post?.user?.full_name || post?.user?.username || "User";

  return (
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

      <View style={styles.contextOverlay} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.authorRow}
          onPress={() => router.push(`/post/${item.id}` as any)}
          activeOpacity={0.85}
        >
          {post?.user?.avatar_url ? (
            <Image
              source={{ uri: post.user.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>
                {(author[0] || "U").toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.authorName} numberOfLines={1}>
              {author}
            </Text>
            {!!post?.user?.username && (
              <Text style={styles.authorHandle} numberOfLines={1}>
                @{post.user.username}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {!!post?.content && (
          <Text style={styles.caption} numberOfLines={3}>
            {post.content}
          </Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={16} color="#FF375F" />
            <Text style={styles.statText}>{post?.like_count ?? 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble-outline" size={16} color="#fff" />
            <Text style={styles.statText}>{post?.comment_count ?? 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="repeat-outline" size={16} color="#fff" />
            <Text style={styles.statText}>{post?.repost_count ?? 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={styles.statText}>{post?.share_count ?? 0}</Text>
          </View>
        </View>
      </View>
    </View>
  );
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

  const openFullPost = useCallback(() => {
    const item = items[activeIndex];
    if (item) {
      onClose();
      router.push(`/post/${item.id}` as any);
    }
  }, [items, activeIndex, onClose]);

  const renderItem = useCallback(
    ({ item }: { item: ViewerMediaItem }) => <ViewerPage item={item} />,
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
          directionalLockEnabled
          disableIntervalMomentum
        />

        <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
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
              onPress={openFullPost}
              activeOpacity={0.85}
            >
              <Text style={styles.viewPostText}>Full Post</Text>
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
    position: "relative",
  },
  media: { width: SCREEN_W, height: SCREEN_H },
  topOverlay: {
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
  contextOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "rgba(0,0,0,0.55)",
    gap: 10,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontWeight: "900", fontSize: 14 },
  authorName: { color: "#fff", fontSize: 14, fontWeight: "800" },
  authorHandle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginTop: 1,
  },
  caption: { color: "#fff", fontSize: 13.5, lineHeight: 19 },
  statsRow: { flexDirection: "row", gap: 18, marginTop: 2 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { color: "#fff", fontSize: 12.5, fontWeight: "700" },
});
