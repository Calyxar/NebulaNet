// lib/queries/communities.ts ✅ FIXED
// Fix: replaced web SDK documentId() with firestore.FieldPath.documentId()
// from @react-native-firebase — they are NOT interchangeable
// ✅ FIX 2: fetchMyCommunities now takes uid as a parameter instead of
// independently reading auth.currentUser. Previously, if this ran in the
// same tick that useAuth()'s `user` became truthy but Firebase's internal
// auth.currentUser hadn't synchronously caught up yet, this function would
// silently return [] every time — emptying the community picker with no
// error, regardless of actual membership data in Firestore.
// ✅ FIX 3: firestore.FieldPath.documentId() was resolving to undefined in
// this codebase (same root-cause bug found and fixed in several other
// files today — app/user/[username]/index.tsx, lib/firestore/posts.ts),
// causing ".where(undefined, 'in', batch)" to throw "undefined is not a
// function". The empty `catch {}` around this swallowed the error
// completely — joined-community lookups silently returned nothing, with
// owned communities the only ones ever appearing in the picker, and zero
// trace anywhere that anything had failed. Switched to per-doc fetches,
// which sidestep FieldPath entirely, and added logging so a future
// failure here can never again disappear without a trace.

import firestore from "@react-native-firebase/firestore";

export type Community = {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  description?: string | null;
};

export async function fetchMyCommunities(uid: string): Promise<Community[]> {
  if (!uid) return [];

  // 1) joined communities
  const memberSnap = await firestore()
    .collection("community_members")
    .where("user_id", "==", uid)
    .limit(500)
    .get();

  const joinedIds = memberSnap.docs
    .map((d) => (d.data() as any).community_id as string | undefined)
    .filter(Boolean) as string[];

  // 2) created/owned communities
  // Note: createCommunity() only ever writes `owner_id` — `created_by` is
  // queried defensively in case older or alternate write paths used it,
  // but as of this codebase it's always empty. Harmless to keep.
  const createdSnaps = await Promise.all([
    firestore()
      .collection("communities")
      .where("owner_id", "==", uid)
      .get()
      .catch(() => null),
    firestore()
      .collection("communities")
      .where("created_by", "==", uid)
      .get()
      .catch(() => null),
  ]);

  const createdRows = createdSnaps
    .flatMap((s) => (s ? s.docs : []))
    .map((d) => ({ id: d.id, ...(d.data() as any) }));

  // 3) fetch joined community docs individually by ref, in batches of 10
  // for parallelism (not for an "in" query limit — there's no longer an
  // "in" query here at all).
  const joinedRows: any[] = [];
  for (let i = 0; i < joinedIds.length; i += 10) {
    const batch = joinedIds.slice(i, i + 10);
    try {
      const docSnaps = await Promise.all(
        batch.map((communityId) =>
          firestore().collection("communities").doc(communityId).get(),
        ),
      );
      docSnaps.forEach((d) => {
        if (!d.exists) return;
        joinedRows.push({ id: d.id, ...(d.data() as any) });
      });
    } catch (err) {
      // ✅ Previously an empty catch {} — this failure was completely
      // silent, with joined communities just disappearing from every
      // picker and tab that uses this function. Never let that happen
      // again without at least a visible trace.
      console.warn("[fetchMyCommunities] failed to fetch joined batch:", err);
    }
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
