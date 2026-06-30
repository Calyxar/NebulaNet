// hooks/useNews.ts
// Reads the news_articles collection populated by the syncNewsFromCurrents
// scheduled Cloud Function. No client-side calls to Currents directly —
// everything is pre-fetched and cached in Firestore.

import firestore from "@react-native-firebase/firestore";
import { useQuery } from "@tanstack/react-query";

export type NewsCategory =
  | "general"
  | "science_technology"
  | "economy_business_finance"
  | "sport"
  | "arts_culture_entertainment"
  | "health";

export const NEWS_CATEGORIES: { key: NewsCategory; label: string }[] = [
  { key: "general", label: "General" },
  { key: "science_technology", label: "Tech" },
  { key: "economy_business_finance", label: "Business" },
  { key: "sport", label: "Sport" },
  { key: "arts_culture_entertainment", label: "Entertainment" },
  { key: "health", label: "Health" },
];

export type NewsArticle = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  author: string | null;
  image: string | null;
  language: string;
  category: string[];
  published: string | null;
};

async function fetchNewsByCategory(
  category: NewsCategory,
  limit: number,
): Promise<NewsArticle[]> {
  const snap = await firestore()
    .collection("news_articles")
    .where("category", "array-contains", category)
    .orderBy("published", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      title: data.title ?? "",
      description: data.description ?? null,
      url: data.url ?? "",
      author: data.author ?? null,
      image: data.image ?? null,
      language: data.language ?? "en",
      category: Array.isArray(data.category) ? data.category : [],
      published: data.published ?? null,
    };
  });
}

export function useNews(category: NewsCategory, limit = 20) {
  return useQuery({
    queryKey: ["news", category, limit],
    queryFn: () => fetchNewsByCategory(category, limit),
    staleTime: 5 * 60 * 1000, // news_articles only refreshes every 3h server-side
  });
}
