// lib/queries/communities.ts ✅ FIXED
// Fix: replaced web SDK documentId() with firestore.FieldPath.documentId()
// from @react-native-firebase — they are NOT interchangeable

import { auth } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

export type Community = {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  description?: string | null;
};

export async function fetchMyCommunities(): Promise<Community[]> {
  const user = auth.currentUser;
  if (!user) return [];

  // 1) joined communities
  const memberSnap = await firestore()
    .collection("community_members")
    .where("user_id", "==", user.uid)
    .limit(500)
    .get();

  const joinedIds = memberSnap.docs
    .map((d) => (d.data() as any).community_id as string | undefined)
    .filter(Boolean) as string[];

  // 2) created/owned communities
  const createdSnaps = await Promise.all([
    firestore()
      .collection("communities")
      .where("owner_id", "==", user.uid)
      .get()
      .catch(() => null),
    firestore()
      .collection("communities")
      .where("created_by", "==", user.uid)
      .get()
      .catch(() => null),
  ]);

  const createdRows = createdSnaps
    .flatMap((s) => (s ? s.docs : []))
    .map((d) => ({ id: d.id, ...(d.data() as any) }));

  // 3) fetch joined community docs in batches of 10
  // ✅ FIX: use firestore.FieldPath.documentId() not web SDK documentId()
  const joinedRows: any[] = [];
  for (let i = 0; i < joinedIds.length; i += 10) {
    const batch = joinedIds.slice(i, i + 10);
    try {
      const snap = await firestore()
        .collection("communities")
        .where(firestore.FieldPath.documentId(), "in", batch)
        .get();
      snap.docs.forEach((d) =>
        joinedRows.push({ id: d.id, ...(d.data() as any) }),
      );
    } catch {}
  }

  // 4) merge + dedupe
  const map = new Map<string, Community>();
  [...createdRows, ...joinedRows].forEach((c: any) => {
    if (!c.id) return;
    map.set(c.id, {
      id: c.id,
      name: c.name ?? "",
      slug: c.slug ?? "",
      image_url: c.image_url ?? null,
      description: c.description ?? null,
    });
  });

  return Array.from(map.values());
}
