// app/create/boost.tsx — REDESIGNED ✅ Twitter-style composer
import { useAuth } from "@/hooks/useAuth";
import { createBoost, type BoostObjective } from "@/lib/firestore/boosts";
import { getPostById, type Post } from "@/lib/firestore/posts";
import { getBoostOffering, purchaseBoostPackage } from "@/lib/revenuecat";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* =========================================================
   CONSTANTS
========================================================= */

const OBJECTIVES: {
  id: BoostObjective;
  label: string;
  subtitle: string;
  icon: string;
  color: string;
}[] = [
  {
    id: "engagement",
    label: "Engagement",
    subtitle: "More likes, comments & shares",
    icon: "heart-outline",
    color: "#EF4444",
  },
  {
    id: "profile_visits",
    label: "Profile Visits",
    subtitle: "Drive people to your profile",
    icon: "person-outline",
    color: "#7C3AED",
  },
  {
    id: "website_clicks",
    label: "Website Clicks",
    subtitle: "Send traffic to your link",
    icon: "globe-outline",
    color: "#10B981",
  },
];

const DURATIONS = [
  { days: 1, label: "1 day" },
  { days: 3, label: "3 days" },
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
];

/* =========================================================
   SCREEN
========================================================= */

export default function CreateBoostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { profile } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [postLoading, setPostLoading] = useState(true);

  const [objective, setObjective] = useState<BoostObjective>("engagement");
  const [durationDays, setDurationDays] = useState(3);
  const [offering, setOffering] = useState<any>(null);
  const [offeringLoading, setOfferingLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const avatarLetter = profile?.username?.charAt(0).toUpperCase() ?? "U";

  // Pick cheapest available package as proxy for "selected package"
  const selectedPackage = useMemo(() => {
    if (!offering?.availablePackages?.length) return null;
    // Try to match duration to a package, else pick first
    return offering.availablePackages[0];
  }, [offering]);

  const priceLabel = useMemo(() => {
    if (!selectedPackage) return null;
    const price =
      selectedPackage.product?.priceString ??
      selectedPackage.product?.price?.toString();
    return price ? `${price} / boost` : null;
  }, [selectedPackage]);

  const canBoost = useMemo(() => !!post && !isPurchasing, [post, isPurchasing]);

  /* ---- load post ---- */
  useEffect(() => {
    if (!postId) return;
    setPostLoading(true);
    getPostById(postId)
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setPostLoading(false));
  }, [postId]);

  /* ---- load RevenueCat offering ---- */
  useEffect(() => {
    setOfferingLoading(true);
    getBoostOffering()
      .then(setOffering)
      .catch(() => setOffering(null))
      .finally(() => setOfferingLoading(false));
  }, []);

  /* ---- purchase + create boost ---- */
  const handleBoost = async () => {
    if (!post || !postId) return;

    // If no RevenueCat offering available (Expo Go), create boost directly
    if (!selectedPackage) {
      Alert.alert(
        "Payment unavailable",
        "In-app purchases require a development build. The boost record will be created for testing.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Create test boost",
            onPress: async () => {
              try {
                setIsPurchasing(true);
                await createBoost({
                  post_id: postId,
                  objective,
                  daily_budget: 5,
                  duration_days: durationDays,
                  total_amount: 5 * durationDays,
                  audience: "auto",
                  revenuecat_product_id: "test",
                });
                Alert.alert("Boost created", "Your post is now being boosted.");
                router.back();
              } catch (e: any) {
                Alert.alert("Error", e?.message || "Failed to create boost.");
              } finally {
                setIsPurchasing(false);
              }
            },
          },
        ],
      );
      return;
    }

    setIsPurchasing(true);
    try {
      const customerInfo = await purchaseBoostPackage(selectedPackage);

      const latestTx =
        customerInfo?.latestExpirationDate ?? customerInfo?.originalAppUserId;

      await createBoost({
        post_id: postId,
        objective,
        daily_budget: selectedPackage.product?.price ?? 5,
        duration_days: durationDays,
        total_amount: (selectedPackage.product?.price ?? 5) * durationDays,
        audience: "auto",
        revenuecat_product_id: selectedPackage.product?.identifier ?? "",
        revenuecat_transaction_id: latestTx ?? undefined,
      });

      Alert.alert(
        "Boost started! 🚀",
        "Your post is now being promoted to more people.",
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch (e: any) {
      if (e?.userCancelled) return;
      Alert.alert("Error", e?.message || "Failed to purchase boost.");
    } finally {
      setIsPurchasing(false);
    }
  };

  /* ---- loading state ---- */
  if (postLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color="#7C3AED" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <Text style={styles.errorText}>Post not found.</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backLink}
          >
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.cancelBtn}
            disabled={isPurchasing}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.postBtn, !canBoost && styles.postBtnDisabled]}
            onPress={handleBoost}
            disabled={!canBoost}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.postBtnText}>Boost</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Composer row — post preview */}
          <View style={styles.composerRow}>
            <View style={styles.avatarCol}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLetter}>{avatarLetter}</Text>
                </View>
              )}
              <View style={styles.avatarLine} />
            </View>

            <View style={styles.previewCol}>
              <View style={styles.boostBadge}>
                <Ionicons name="rocket-outline" size={12} color="#7C3AED" />
                <Text style={styles.boostBadgeText}>Boosting this post</Text>
              </View>

              {post.content ? (
                <Text style={styles.postContent} numberOfLines={3}>
                  {post.content}
                </Text>
              ) : null}

              {post.media_urls?.[0] && (
                <Image
                  source={{ uri: post.media_urls[0] }}
                  style={styles.postThumb}
                  resizeMode="cover"
                />
              )}

              <View style={styles.postMeta}>
                <Ionicons name="heart-outline" size={14} color="#9CA3AF" />
                <Text style={styles.postMetaText}>{post.like_count}</Text>
                <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" />
                <Text style={styles.postMetaText}>{post.comment_count}</Text>
              </View>
            </View>
          </View>

          {/* Settings */}
          <View style={styles.settingsSection}>
            <View style={styles.avatarColSpacer} />
            <View style={styles.settingsCol}>
              {/* Objective */}
              <Text style={styles.sectionLabel}>Objective</Text>
              <View style={styles.optionsCard}>
                {OBJECTIVES.map((obj, index) => {
                  const active = objective === obj.id;
                  return (
                    <React.Fragment key={obj.id}>
                      {index > 0 && <View style={styles.divider} />}
                      <TouchableOpacity
                        style={styles.optionRow}
                        onPress={() => setObjective(obj.id)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.optionIcon,
                            { backgroundColor: obj.color + "15" },
                          ]}
                        >
                          <Ionicons
                            name={obj.icon as any}
                            size={18}
                            color={obj.color}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.optionTitle}>{obj.label}</Text>
                          <Text style={styles.optionSubtitle}>
                            {obj.subtitle}
                          </Text>
                        </View>
                        {active && (
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color="#7C3AED"
                          />
                        )}
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </View>

              {/* Duration */}
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                Duration
              </Text>
              <View style={styles.chipRow}>
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d.days}
                    style={[
                      styles.chip,
                      durationDays === d.days && styles.chipActive,
                    ]}
                    onPress={() => setDurationDays(d.days)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        durationDays === d.days && styles.chipTextActive,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Pricing */}
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                Pricing
              </Text>
              <View style={styles.pricingCard}>
                {offeringLoading ? (
                  <View style={styles.pricingRow}>
                    <ActivityIndicator color="#7C3AED" size="small" />
                    <Text style={styles.pricingLoading}>
                      Loading pricing...
                    </Text>
                  </View>
                ) : priceLabel ? (
                  <>
                    <View style={styles.pricingRow}>
                      <View style={styles.pricingIconWrap}>
                        <Ionicons
                          name="pricetag-outline"
                          size={18}
                          color="#7C3AED"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pricingTitle}>Boost price</Text>
                        <Text style={styles.pricingValue}>{priceLabel}</Text>
                      </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.pricingRow}>
                      <View style={styles.pricingIconWrap}>
                        <Ionicons
                          name="calculator-outline"
                          size={18}
                          color="#7C3AED"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pricingTitle}>
                          Total for {durationDays} day
                          {durationDays > 1 ? "s" : ""}
                        </Text>
                        <Text style={styles.pricingValue}>
                          {selectedPackage?.product?.priceString ?? "—"} ×{" "}
                          {durationDays}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.pricingRow}>
                    <View style={styles.pricingIconWrap}>
                      <Ionicons
                        name="information-circle-outline"
                        size={18}
                        color="#9CA3AF"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pricingTitle}>
                        Pricing unavailable
                      </Text>
                      <Text style={styles.pricingSubtitle}>
                        Requires a production build
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Audience */}
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                Audience
              </Text>
              <View style={styles.pricingCard}>
                <View style={styles.pricingRow}>
                  <View
                    style={[
                      styles.pricingIconWrap,
                      { backgroundColor: "#EDE9FE" },
                    ]}
                  >
                    <Ionicons name="people-outline" size={18} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pricingTitle}>Auto-targeted</Text>
                    <Text style={styles.pricingSubtitle}>
                      We'll find the best audience for your post
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={22} color="#7C3AED" />
                </View>
              </View>

              <Text style={styles.disclaimer}>
                By tapping Boost, you agree to NebulaNet's advertising terms.
                Boosts are non-refundable once started.
              </Text>

              <View style={{ height: 32 }} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: { fontSize: 16, color: "#374151", fontWeight: "600" },
  backLink: { paddingVertical: 8 },
  backLinkText: { color: "#7C3AED", fontWeight: "600" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cancelBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: { fontSize: 16, color: "#374151", fontWeight: "500" },
  postBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 72,
    alignItems: "center",
  },
  postBtnDisabled: { backgroundColor: "#C4B5FD" },
  postBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  scroll: { flex: 1 },

  composerRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  avatarCol: { alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 18 },
  avatarLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: "#E5E7EB",
    marginTop: 8,
    borderRadius: 1,
  },

  previewCol: { flex: 1, paddingBottom: 12 },
  boostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#7C3AED",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  boostBadgeText: { fontSize: 12, fontWeight: "600", color: "#7C3AED" },
  postContent: {
    fontSize: 16,
    color: "#111827",
    lineHeight: 22,
    marginBottom: 10,
  },
  postThumb: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginBottom: 10,
  },
  postMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  postMetaText: { fontSize: 13, color: "#9CA3AF" },

  settingsSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },
  avatarColSpacer: { width: 44 },
  settingsCol: { flex: 1 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 10,
  },

  optionsCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  optionSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },

  divider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 14 },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  chipActive: {
    backgroundColor: "#EDE9FE",
    borderColor: "#7C3AED",
  },
  chipText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  chipTextActive: { color: "#7C3AED" },

  pricingCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    overflow: "hidden",
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  pricingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  pricingTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  pricingValue: {
    fontSize: 13,
    color: "#7C3AED",
    fontWeight: "600",
    marginTop: 2,
  },
  pricingSubtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  pricingLoading: { fontSize: 14, color: "#9CA3AF", marginLeft: 8 },

  disclaimer: {
    fontSize: 11,
    color: "#9CA3AF",
    lineHeight: 16,
    marginTop: 16,
  },
});
