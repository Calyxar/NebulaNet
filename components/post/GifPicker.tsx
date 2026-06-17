// components/post/GifPicker.tsx ✅ GIPHY
// Replaces Klipy with Giphy API
// Add to .env: EXPO_PUBLIC_GIPHY_API_KEY=your_key_here

import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GIPHY_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY ?? "";
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

const { width: SCREEN_W } = Dimensions.get("window");
const COL = 2;
const GAP = 6;
const CELL_W = (SCREEN_W - 32 - GAP) / COL;

interface GiphyResult {
  id: string;
  url: string; // full GIF url (for sending)
  preview: string; // downsized preview (for display)
  width: number;
  height: number;
  title: string;
}

function parseGiphy(item: any): GiphyResult {
  const images = item.images ?? {};
  // Use downsized_medium for display (good quality, reasonable size)
  const display =
    images.downsized_medium ?? images.fixed_width ?? images.original ?? {};
  // Use downsized for the actual URL sent (smaller file)
  const send = images.downsized ?? images.fixed_width ?? images.original ?? {};
  return {
    id: item.id,
    url: send.url ?? "",
    preview: display.url ?? send.url ?? "",
    width: Number(display.width ?? 200),
    height: Number(display.height ?? 200),
    title: item.title ?? "",
  };
}

async function fetchGiphy(
  endpoint: "trending" | "search",
  params: Record<string, string>,
): Promise<GiphyResult[]> {
  const qs = new URLSearchParams({
    api_key: GIPHY_KEY,
    limit: "24",
    rating: "g",
    ...params,
  }).toString();
  const res = await fetch(`${GIPHY_BASE}/${endpoint}?${qs}`);
  if (!res.ok) throw new Error(`Giphy ${res.status}`);
  const json = await res.json();
  return (json.data ?? []).map(parseGiphy).filter((r: GiphyResult) => !!r.url);
}

interface Props {
  visible: boolean;
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

export default function GifPicker({ visible, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiphyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchGiphy("trending", {});
      setResults(data);
    } catch (e: any) {
      setError("Couldn't load trending GIFs.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        loadTrending();
        return;
      }
      setLoading(true);
      setError("");
      try {
        const data = await fetchGiphy("search", { q });
        setResults(data);
        if (data.length === 0) setError(`No GIFs found for "${q}"`);
      } catch {
        setError("Search failed. Try again.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [loadTrending],
  );

  useEffect(() => {
    if (visible) {
      setQuery("");
      setError("");
      loadTrending();
    }
  }, [visible, loadTrending]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 400);
  };

  const renderItem = useCallback(
    ({ item, index }: { item: GiphyResult; index: number }) => {
      const aspectRatio = item.width / Math.max(item.height, 1);
      const cellH = Math.min(
        Math.max(Math.round(CELL_W / aspectRatio), 80),
        200,
      );
      return (
        <TouchableOpacity
          style={[
            styles.cell,
            {
              width: CELL_W,
              height: cellH,
              marginLeft: index % COL === 0 ? 0 : GAP,
              backgroundColor: colors.surface,
            },
          ]}
          onPress={() => {
            onSelect(item.url);
            onClose();
          }}
          activeOpacity={0.85}
        >
          <Image
            source={{ uri: item.preview }}
            style={styles.cellImg}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    },
    [onSelect, onClose, colors],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.background, paddingBottom: insets.bottom },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>GIFs</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surface }]}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={16} color={colors.textTertiary} />
            <TextInput
              value={query}
              onChangeText={handleQueryChange}
              placeholder="Search GIFs…"
              placeholderTextColor={colors.textTertiary}
              style={[styles.searchInput, { color: colors.text }]}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                search(query);
              }}
            />
            {!!query && (
              <TouchableOpacity
                onPress={() => {
                  setQuery("");
                  setError("");
                  loadTrending();
                }}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.poweredBy, { color: colors.textTertiary }]}>
            Powered by GIPHY
          </Text>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error && results.length === 0 ? (
          <View style={styles.centerWrap}>
            <Ionicons
              name="images-outline"
              size={40}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              {error}
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            numColumns={COL}
            renderItem={renderItem}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.centerWrap}>
                <Ionicons
                  name="images-outline"
                  size={40}
                  color={colors.textTertiary}
                />
                <Text
                  style={[styles.emptyText, { color: colors.textTertiary }]}
                >
                  {query
                    ? `No GIFs found for "${query}"`
                    : "No trending GIFs right now"}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 17, fontWeight: "900" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "600" },
  poweredBy: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  grid: { padding: 16, gap: GAP },
  cell: { borderRadius: 12, overflow: "hidden", marginBottom: GAP },
  cellImg: { width: "100%", height: "100%" },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
    marginTop: 60,
  },
  emptyText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
});
