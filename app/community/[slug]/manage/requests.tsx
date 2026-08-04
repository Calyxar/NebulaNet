// app/community/[slug]/manage/requests.tsx

import AppHeader from "@/components/navigation/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/providers/ThemeProvider";
import firestore from "@react-native-firebase/firestore";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type JoinRequest = {
  id: string;
  user_id: string;
  community_id: string;
  created_at?: any;
  profile?: {
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

export default function JoinRequestsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const { colors, uiScale, fontScale } = useTheme();

  const [communityId, setCommunityId] = useState<string | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    if (!slug || !user?.uid) return;

    try {
      setLoading(true);

      // Find community
      const communitySnap = await firestore()
        .collection("communities")
        .where("slug", "==", slug)
        .limit(1)
        .get();

      if (communitySnap.empty) throw new Error("Community not found");

      const community = communitySnap.docs[0];

      setCommunityId(community.id);

      // Get requests
      const requestSnap = await firestore()
        .collection("community_requests")
        .where("community_id", "==", community.id)
        .where("status", "==", "pending")
        .get();

      const items = await Promise.all(
        requestSnap.docs.map(async (req) => {
          const data = req.data();

          const profileSnap = await firestore()
            .collection("profiles")
            .doc(data.user_id)
            .get();

          return {
            id: req.id,
            ...data,
            profile: profileSnap.exists() ? profileSnap.data() : null,
          } as JoinRequest;
        }),
      );

      setRequests(items);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed loading requests");
    } finally {
      setLoading(false);
    }
  }, [slug, user?.uid]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const approveRequest = async (request: JoinRequest) => {
    if (!communityId) return;

    try {
      await firestore().collection("community_members").add({
        community_id: communityId,
        user_id: request.user_id,
        role: "member",
        joined_at: firestore.FieldValue.serverTimestamp(),
      });

      await firestore()
        .collection("community_requests")
        .doc(request.id)
        .update({
          status: "approved",
        });

      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const declineRequest = async (request: JoinRequest) => {
    try {
      await firestore()
        .collection("community_requests")
        .doc(request.id)
        .update({
          status: "declined",
        });

      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.center,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <AppHeader
        leftWide={
          <TouchableOpacity onPress={() => router.back()}>
            <Text
              style={{
                color: colors.text,
                fontWeight: "900",
                fontSize: 18,
              }}
            >
              ← Join Requests
            </Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16 * uiScale,
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text
              style={{
                color: colors.textTertiary,
                fontWeight: "800",
              }}
            >
              No pending requests
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const name =
            item.profile?.full_name ?? item.profile?.username ?? "Unknown User";

          return (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {item.profile?.avatar_url ? (
                <Image
                  source={{
                    uri: item.profile.avatar_url,
                  }}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                  }}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: "900",
                    }}
                  >
                    {name[0]}
                  </Text>
                </View>
              )}

              <View
                style={{
                  flex: 1,
                  marginLeft: 12,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "900",
                    fontSize: 15 * fontScale,
                  }}
                >
                  {name}
                </Text>

                {item.profile?.username && (
                  <Text
                    style={{
                      color: colors.textTertiary,
                    }}
                  >
                    @{item.profile.username}
                  </Text>
                )}

                <View
                  style={{
                    flexDirection: "row",
                    marginTop: 12,
                    gap: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => approveRequest(item)}
                    style={[
                      styles.button,
                      {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "900",
                      }}
                    >
                      Approve
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => declineRequest(item)}
                    style={[
                      styles.button,
                      {
                        backgroundColor: colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "900",
                      }}
                    >
                      Decline
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
