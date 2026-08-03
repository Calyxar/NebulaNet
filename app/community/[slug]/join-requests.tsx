// app/community/[slug]/join-requests.tsx
import AppHeader from "@/components/navigation/AppHeader";
import { getTabBarHeight } from "@/components/navigation/CurvedTabBar";
import {
  approveJoinRequest,
  declineJoinRequest,
  getCommunityJoinRequests,
  type CommunityJoinRequest,
} from "@/lib/firestore/communityRequests";
import { createNotification } from "@/lib/firestore/notifications";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type UserProfile = {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
};

type JoinRequestRow = CommunityJoinRequest & {
  profile?: UserProfile;
};

export default function JoinRequestsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { colors, isDark, uiScale, fontScale } = useTheme();

  const insets = useSafeAreaInsets();

  const bottomPadding = useMemo(
    () => getTabBarHeight(insets.bottom) + 20,
    [insets.bottom],
  );

  const [communityId, setCommunityId] = useState<string | null>(null);

  const [requests, setRequests] = useState<JoinRequestRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");

  const loadRequests = useCallback(async () => {
    if (!slug) return;

    try {
      if (!refreshing) setLoading(true);

      const communitySnap = await firestore()
        .collection("communities")
        .where("slug", "==", slug)
        .limit(1)
        .get();

      if (communitySnap.empty) {
        setRequests([]);
        return;
      }

      const communityDoc = communitySnap.docs[0];

      const communityId = communityDoc.id;

      setCommunityId(communityId);

      const joinRequests = await getCommunityJoinRequests(communityId);

      const rows: JoinRequestRow[] = await Promise.all(
        joinRequests.map(async (request: CommunityJoinRequest) => {
          try {
            const profileDoc = await firestore()
              .collection("profiles")
              .doc(request.user_id)
              .get();

            return {
              ...request,
              profile: profileDoc.exists()
                ? ({
                    id: profileDoc.id,
                    ...(profileDoc.data() as any),
                  } as UserProfile)
                : undefined,
            };
          } catch {
            return request;
          }
        }),
      );

      setRequests(rows);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug, refreshing]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    if (!search.trim()) return requests;

    const q = search.toLowerCase();

    return requests.filter((r) => {
      const name = r.profile?.full_name ?? "";
      const username = r.profile?.username ?? "";

      return (
        name.toLowerCase().includes(q) || username.toLowerCase().includes(q)
      );
    });
  }, [requests, search]);

  const handleApprove = async (userId: string) => {
    if (!communityId) return;

    try {
      await approveJoinRequest(communityId, userId);
      const communityDoc = await firestore()
        .collection("communities")
        .doc(communityId)
        .get();

      const community = communityDoc.data();

      await createNotification({
        type: "community_invite",
        receiver_id: userId,
        entity_type: "community",
        entity_id: communityId,
        text: `Your request to join ${community?.name ?? "the community"} was approved.`,
      });

      setRequests((prev) => prev.filter((r) => r.user_id !== userId));
    } catch {
      Alert.alert("Error", "Unable to approve join request.");
    }
  };

  const handleDecline = async (userId: string) => {
    if (!communityId) return;

    Alert.alert("Decline Request", "Remove this join request?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          try {
            await declineJoinRequest(communityId, userId);
            const communityDoc = await firestore()
              .collection("communities")
              .doc(communityId)
              .get();

            const community = communityDoc.data();

            await createNotification({
              type: "system",
              receiver_id: userId,
              entity_type: "community",
              entity_id: communityId,
              text: `Your request to join ${community?.name ?? "the community"} was declined.`,
            });

            setRequests((prev) => prev.filter((r) => r.user_id !== userId));
          } catch {
            Alert.alert("Error", "Unable to decline request.");
          }
        },
      },
    ]);
  };

  const renderRequestItem = ({ item }: { item: JoinRequestRow }) => (
    <View style={[styles.requestCard, { backgroundColor: colors.card }]}>
      <View style={styles.requestHeader}>
        <Image
          source={{
            uri: item.profile?.avatar_url || "https://via.placeholder.com/40",
          }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text
            style={[styles.userName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.profile?.full_name || "Unknown User"}
          </Text>
          <Text
            style={[styles.username, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            @{item.profile?.username || "unknown"}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.success }]}
          onPress={() => handleApprove(item.user_id)}
        >
          <Ionicons name="checkmark" size={18} color="#fff" />
          <Text style={styles.actionText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.error }]}
          onPress={() => handleDecline(item.user_id)}
        >
          <Ionicons name="close" size={18} color="#fff" />
          <Text style={styles.actionText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <AppHeader title="Join Requests" />

      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.card,
              color: colors.text,
            },
          ]}
          placeholder="Search by name or username"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredRequests.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name="mail-outline"
            size={48}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {search.trim() ? "No requests found" : "No join requests"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.user_id}
          renderItem={renderRequestItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadRequests();
              }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomPadding },
          ]}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  requestCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
  },
  username: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
