// app/(tabs)/explore.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("trending");

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EAF6" />
      <SafeAreaView style={styles.container}>
        {/* Header with Search */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#9FA8DA"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#9FA8DA"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {["Trending", "Account", "Post", "Community"].map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                activeCategory === category.toLowerCase() &&
                  styles.activeCategoryButton,
              ]}
              onPress={() => setActiveCategory(category.toLowerCase())}
            >
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === category.toLowerCase() &&
                    styles.activeCategoryText,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeCategory === "trending" && (
            <View style={styles.emptyState}>
              <Ionicons name="trending-up-outline" size={64} color="#C5CAE9" />
              <Text style={styles.emptyStateTitle}>
                No Trending Content Yet
              </Text>
              <Text style={styles.emptyStateText}>
                Trending topics will appear here when users start engaging with
                hashtags and popular content.
              </Text>
            </View>
          )}

          {activeCategory === "account" && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#C5CAE9" />
              <Text style={styles.emptyStateTitle}>No Accounts Found</Text>
              <Text style={styles.emptyStateText}>
                Search for accounts or wait for recommendations to appear.
              </Text>
            </View>
          )}

          {activeCategory === "post" && (
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color="#C5CAE9"
              />
              <Text style={styles.emptyStateTitle}>No Posts Found</Text>
              <Text style={styles.emptyStateText}>
                Posts matching your search will appear here.
              </Text>
            </View>
          )}

          {activeCategory === "community" && (
            <View style={styles.emptyState}>
              <Ionicons
                name="people-circle-outline"
                size={64}
                color="#C5CAE9"
              />
              <Text style={styles.emptyStateTitle}>No Communities Yet</Text>
              <Text style={styles.emptyStateText}>
                Communities will appear here as they are created and recommended
                to you.
              </Text>
            </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#000",
  },
  categoriesContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5F0",
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  activeCategoryButton: {
    backgroundColor: "#7C3AED",
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeCategoryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 15,
    color: "#9FA8DA",
    textAlign: "center",
    lineHeight: 22,
  },
});
