// app/(tabs)/notifications.tsx - SIMPLIFIED FIXED VERSION
import { useNotifications } from "@/hooks/useNotifications";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  const {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    deleteNotification,
    clearAllNotifications,
    refetch,
    getNotificationTitle,
    getNotificationBody,
    getNotificationIcon,
    getNotificationColor,
    groupNotificationsByDate,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<
    string | null
  >(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notificationId: string) => {
    try {
      // Mark as read
      await markAsRead.mutateAsync(notificationId);

      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Navigate based on notification type
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification) {
        switch (notification.type) {
          case "like":
          case "comment":
          case "mention":
          case "post_shared":
            if (notification.post_id) {
              // Use router.push with proper type casting
              router.push(`/post/${notification.post_id}` as any);
            }
            break;
          case "follow":
            if (notification.sender_id) {
              router.push(`/user/${notification.sender.username}` as any);
            }
            break;
          case "community_invite":
            if (notification.community_id) {
              router.push(`/community/${notification.community?.slug}` as any);
            }
            break;
          case "story_comment":
          case "story_like":
            if (notification.story_id) {
              // Navigate to story viewer - create this route first
              // router.push(`/story/${notification.story_id}` as any);
            }
            break;
          case "message":
            if (notification.conversation_id) {
              // Use router.push with object syntax
              router.push({
                pathname: "/chat/[id]",
                params: { id: notification.conversation_id },
              } as any);
            }
            break;
          case "join_request":
            if (notification.community_id) {
              router.push(
                `/community/${notification.community?.slug}/members` as any,
              );
            }
            break;
        }
      }
    } catch (error) {
      console.error("Error handling notification press:", error);
    }
  };

  const handleLongPress = (notificationId: string) => {
    setSelectedNotification(notificationId);
    Alert.alert("Notification Options", "Choose an action", [
      {
        text: "Mark as Read",
        onPress: () => markAsRead.mutate(notificationId),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Notification",
            "Are you sure you want to delete this notification?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => deleteNotification.mutate(notificationId),
              },
            ],
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to clear all notifications? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => clearAllNotifications.mutate(),
        },
      ],
    );
  };

  const handleMarkAllAsRead = () => {
    Alert.alert("Mark All as Read", "Mark all notifications as read?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark All",
        onPress: () => markAsRead.mutate(undefined), // FIX: Pass undefined explicitly
      },
    ]);
  };

  const handleCopyInviteLink = async () => {
    try {
      const inviteLink = "https://nebulanet.space/invite/your-code";
      await Share.share({
        message: `Join me on NebulaNet! ${inviteLink}`,
      });
    } catch (error) {
      console.error("Error sharing invite:", error);
      Alert.alert("Error", "Failed to share invite link");
    }
  };

  const handleMenuPress = () => {
    Alert.alert("Notification Options", "Choose an action", [
      {
        text: "Mark All as Read",
        onPress: handleMarkAllAsRead,
      },
      {
        text: "Clear All Notifications",
        style: "destructive",
        onPress: handleClearAll,
      },
      {
        text: "Refresh",
        onPress: () => refetch(),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const renderNotificationItem = ({ item }: { item: any }) => {
    const iconName = getNotificationIcon(item.type);
    const iconColor = getNotificationColor(item.type);
    const title = getNotificationTitle(item);
    const body = getNotificationBody(item);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotification,
          selectedNotification === item.id && styles.selectedNotification,
        ]}
        onPress={() => handleNotificationPress(item.id)}
        onLongPress={() => handleLongPress(item.id)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.notificationLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${iconColor}15` },
            ]}
          >
            <Ionicons name={iconName as any} size={20} color={iconColor} />
          </View>
        </View>

        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{title}</Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {body}
          </Text>
          <Text style={styles.notificationTime}>
            {formatDistanceToNow(new Date(item.created_at), {
              addSuffix: true,
            })}
          </Text>
        </View>

        {!item.read && (
          <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />
        )}

        {selectedNotification === item.id && (
          <View style={styles.selectedOverlay} />
        )}
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, data: any[]) => {
    if (data.length === 0) return null;

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionContent}>
          {data.map((item) => (
            <React.Fragment key={item.id}>
              {renderNotificationItem({ item })}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.headerRight}>
            {notifications.length > 0 && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleMarkAllAsRead}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="checkmark-done" size={22} color="#7C3AED" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleMenuPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7C3AED"
              colors={["#7C3AED"]}
            />
          }
        >
          {/* Invite Friends Card */}
          <View style={styles.inviteCard}>
            <View style={styles.inviteContent}>
              <View style={styles.inviteIconContainer}>
                <Ionicons name="gift-outline" size={28} color="#7C3AED" />
              </View>
              <View style={styles.inviteTextContainer}>
                <Text style={styles.inviteTitle}>Invite Friends</Text>
                <Text style={styles.inviteSubtitle}>
                  Share NebulaNet with friends and earn rewards
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={handleCopyInviteLink}
            >
              <Ionicons name="share-outline" size={18} color="#7C3AED" />
              <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
          </View>

          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons
                  name="notifications-off-outline"
                  size={64}
                  color="#C5CAE9"
                />
              </View>
              <Text style={styles.emptyTitle}>No Notifications Yet</Text>
              <Text style={styles.emptySubtitle}>
                When you get likes, comments, and follows, they&apos;ll appear
                here. Stay active to get notifications!
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => refetch()}
              >
                <Ionicons name="refresh" size={20} color="#7C3AED" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {Object.entries(groupedNotifications).map(([group, items]) => (
                <React.Fragment key={group}>
                  {renderSection(group, items)}
                </React.Fragment>
              ))}

              {/* Clear All Button at bottom */}
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={handleClearAll}
              >
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                <Text style={styles.clearAllButtonText}>
                  Clear All Notifications
                </Text>
              </TouchableOpacity>

              <View style={styles.bottomSpacer} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8EAF6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#E8EAF6",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  unreadBadge: {
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  inviteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inviteContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  inviteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  inviteTextContainer: {
    flex: 1,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  inviteSubtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    marginLeft: 12,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7C3AED",
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    position: "relative",
  },
  unreadNotification: {
    backgroundColor: "#F5F3FF",
  },
  selectedNotification: {
    backgroundColor: "#F0F0F0",
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  notificationLeft: {
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationBody: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#9FA8DA",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7C3AED",
  },
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5F5",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFE5E5",
  },
  clearAllButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FF3B30",
  },
  bottomSpacer: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
