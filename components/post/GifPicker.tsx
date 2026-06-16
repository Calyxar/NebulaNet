// components/post/GifPicker.tsx ✅
// Klipy GIF search + trending (Tenor replacement — same API structure)
// Free API: https://klipy.com → sign up → get key
// Add to .env: EXPO_PUBLIC_KLIPY_API_KEY=your_key_here

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

const KLIPY_KEY = process.env.EXPO_PUBLIC_KLIPY_API_KEY ?? "";
const KLIPY_BASE = "https://g.klipy.co/api/v1";

const { width: SCREEN_W } = Dimensions.get("window");
const COL = 2;
const GAP = 6;
const CELL_W = (SCREEN_W - 32 - GAP) / COL;

interface KlipyResult {
  id: string;
  url: string;
  preview: string;
  width: number;
  height: number;
}

async function fetchKlipy(
  endpoint: string,
  params: Record<string, string>,
): Promise<KlipyResult[]> {
  const qs = new URLSearchParams({
    api_key: KLIPY_KEY,
    limit: "24",
    ...params,
  }).toString();
  const res = await fetch(`${KLIPY_BASE}/${endpoint}?${qs}`);
  const json = await res.json();

  return (json.results ?? json.data ?? [])
    .map((r: any) => {
      // Klipy mirrors Tenor's media_formats structure
      const files = r.files ?? r.media_formats ?? {};
      const gif = files.gif ?? files.mediumgif ?? files.tinygif ?? {};
      const nano = files.nanogif ?? files.tinygif ?? gif;
      return {
        id: r.id ?? r.slug ?? Math.random().toString(),
        url: gif.url ?? r.url ?? "",
        preview: nano.url ?? gif.url ?? r.url ?? "",
        width: gif.dims?.[0] ?? gif.width ?? 200,
        height: gif.dims?.[1] ?? gif.height ?? 200,
      };
    })
    .filter((r: KlipyResult) => !!r.url);
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
  const [results, setResults] = useState<KlipyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTrending = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchKlipy("gifs/trending", {});
      setResults(data);
    } catch {
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
      try {
        const data = await fetchKlipy("gifs/search", { q });
        setResults(data);
      } catch {
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
      loadTrending();
    }
  }, [visible, loadTrending]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 400);
  };

  const renderItem = useCallback(
    ({ item, index }: { item: KlipyResult; index: number }) => {
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
          onPress={() => onSelect(item.preview)}
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
    [onSelect, colors],
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

          {/* Search */}
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
              onSubmitEditing={() => search(query)}
            />
            {!!query && (
              <TouchableOpacity
                onPress={() => {
                  setQuery("");
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
            Powered by Klipy
          </Text>
        </View>

        {/* Grid */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : results.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons
              name="images-outline"
              size={40}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              {query
                ? `No GIFs found for "${query}"`
                : "No trending GIFs right now"}
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
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
});
