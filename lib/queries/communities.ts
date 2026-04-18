// lib/queries/communities.ts — FIRESTORE ✅ (joined + created)

import { auth, db } from "@/lib/firebase";
import { documentId } from "firebase/firestore";

export type Community = {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
};

export async function fetchMyCommunities(): Promise<Community[]> {
  const user = auth.currentUser;
  if (!user) return [];

  // 1) joined communities
  const memberSnap = await db
    .collection("community_members")
    .where("user_id", "==", user.uid)
    .limit(500)
    .get();

  const joinedIds = memberSnap.docs
    .map((d) => (d.data() as any).community_id as string | undefined)
    .filter(Boolean) as string[];

  // 2) created communities — support multiple possible owner fields
  const createdSnaps = await Promise.all(
    [
      db
        .collection("communities")
        .where("created_by", "==", user.uid)
        .orderBy("created_at", "desc")
        .limit(200)
        .get(),
      db
        .collection("communities")
        .where("owner_id", "==", user.uid)
        .orderBy("created_at", "desc")
        .limit(200)
        .get(),
      db
        .collection("communities")
        .where("user_id", "==", user.uid)
        .orderBy("created_at", "desc")
        .limit(200)
        .get(),
    ].map(async (q) => {
      try {
        return await q;
      } catch {
        return null;
      }
    }),
  );

  const createdRows = createdSnaps
    .flatMap((s) => (s ? s.docs : []))
    .map((d) => ({ id: d.id, ...(d.data() as any) }));

  // 3) fetch joined community docs in batches of 10
  const joinedRows: any[] = [];
  for (let i = 0; i < joinedIds.length; i += 10) {
    const batch = joinedIds.slice(i, i + 10);
    const snap = await db
      .collection("communities")
      .where(documentId(), "in", batch)
      .get();
    snap.docs.forEach((d) =>
      joinedRows.push({ id: d.id, ...(d.data() as any) }),
    );
  }

  // 4) merge + dedupe
  const map = new Map<string, Community>();

  [...createdRows, ...joinedRows].forEach((c: any) => {
    map.set(c.id, {
      id: c.id,
      name: c.name,
      slug: c.slug,
      image_url: c.image_url ?? null,
    });
  });

  return Array.from(map.values());
}
