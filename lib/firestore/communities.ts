// lib/firestore/communities.ts — FIRESTORE ✅
// Matches Supabase schema:
// communities: id, name, description, image_url, member_count, created_at, updated_at, slug, owner_id
// community_members: id, user_id, community_id, role, created_at

import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

/* =========================================================
   TYPES
========================================================= */

export type Community = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
  slug: string;
  owner_id: string | null;
};

export type CommunityMember = {
  id: string;
  user_id: string;
  community_id: string;
  role: string | null;
  created_at: string;
};

export type CreateCommunityData = {
  name: string;
  description?: string | null;
  image_url?: string | null;
  slug: string;
};

/* =========================================================
   HELPERS
========================================================= */

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof firestore.Timestamp) return ts.toDate().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function docToCommunity(d: any, id: string): Community {
  return {
    id,
    name: d.name ?? "",
    description: d.description ?? null,
    image_url: d.image_url ?? null,
    member_count: d.member_count ?? 0,
    created_at: tsToIso(d.created_at),
    updated_at: tsToIso(d.updated_at),
    slug: d.slug ?? "",
    owner_id: d.owner_id ?? null,
  };
}

/* =========================================================
   FETCH
========================================================= */

export async function fetchAllCommunities(
  limitCount = 50,
): Promise<Community[]> {
  const snap = await db
    .collection("communities")
    .orderBy("created_at", "desc")
    .limit(limitCount)
    .get();

  return snap.docs.map((d) => docToCommunity(d.data(), d.id));
}

export async function fetchCommunityById(
  id: string,
): Promise<Community | null> {
  const snap = await db.collection("communities").doc(id).get();
  const data = snap.data();
  if (!data) return null;
  return docToCommunity(data, snap.id);
}

export async function fetchCommunityBySlug(
  slug: string,
): Promise<Community | null> {
  const snap = await db
    .collection("communities")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return docToCommunity(snap.docs[0].data(), snap.docs[0].id);
}

export async function fetchMyCommunities(): Promise<Community[]> {
  const user = auth.currentUser;
  if (!user) return [];

  // 1) Communities user is a member of
  const memberSnap = await db
    .collection("community_members")
    .where("user_id", "==", user.uid)
    .limit(500)
    .get();

  const joinedIds = memberSnap.docs
    .map((d) => (d.data() as any).community_id as string)
    .filter(Boolean);

  // 2) Communities user owns
  const ownedSnap = await db
    .collection("communities")
    .where("owner_id", "==", user.uid)
    .orderBy("created_at", "desc")
    .limit(200)
    .get();

  const ownedRows = ownedSnap.docs.map((d) => docToCommunity(d.data(), d.id));

  // 3) Fetch joined community docs (chunked, max 10 per query)
  const joinedRows: Community[] = [];
  for (let i = 0; i < joinedIds.length; i += 10) {
    const batch = joinedIds.slice(i, i + 10);
    const snap = await db
      .collection("communities")
      .where(firestore.FieldPath.documentId(), "in", batch)
      .get();
    snap.docs.forEach((d) => joinedRows.push(docToCommunity(d.data(), d.id)));
  }

  // 4) Merge + dedupe
  const map = new Map<string, Community>();
  [...ownedRows, ...joinedRows].forEach((c) => map.set(c.id, c));

  return Array.from(map.values());
}

export async function fetchCommunityMembers(
  communityId: string,
): Promise<CommunityMember[]> {
  const snap = await db
    .collection("community_members")
    .where("community_id", "==", communityId)
    .orderBy("created_at", "asc")
    .get();

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      user_id: data.user_id,
      community_id: data.community_id,
      role: data.role ?? null,
      created_at: tsToIso(data.created_at),
    };
  });
}

export async function fetchIsMember(communityId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  const snap = await db
    .collection("community_members")
    .where("community_id", "==", communityId)
    .where("user_id", "==", user.uid)
    .limit(1)
    .get();

  return !snap.empty;
}

/* =========================================================
   CREATE
========================================================= */

export async function createCommunity(
  data: CreateCommunityData,
): Promise<Community> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const existing = await fetchCommunityBySlug(data.slug);
  if (existing) throw new Error("A community with this slug already exists");

  const docRef = await db.collection("communities").add({
    name: data.name.trim(),
    description: data.description ?? null,
    image_url: data.image_url ?? null,
    slug: data.slug.trim(),
    owner_id: user.uid,
    member_count: 1,
    created_at: firestore.FieldValue.serverTimestamp(),
    updated_at: firestore.FieldValue.serverTimestamp(),
  });

  // Auto-join creator as owner
  await db.collection("community_members").add({
    user_id: user.uid,
    community_id: docRef.id,
    role: "owner",
    created_at: firestore.FieldValue.serverTimestamp(),
  });

  const snap = await docRef.get();
  return docToCommunity(snap.data(), snap.id);
}

/* =========================================================
   UPDATE
========================================================= */

export async function updateCommunity(
  communityId: string,
  updates: Partial<
    Pick<Community, "name" | "description" | "image_url" | "slug">
  >,
): Promise<void> {
  await db
    .collection("communities")
    .doc(communityId)
    .update({
      ...updates,
      updated_at: firestore.FieldValue.serverTimestamp(),
    });
}

/* =========================================================
   DELETE
========================================================= */

export async function deleteCommunity(communityId: string): Promise<void> {
  const batch = db.batch();

  const memberSnap = await db
    .collection("community_members")
    .where("community_id", "==", communityId)
    .get();

  memberSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(db.collection("communities").doc(communityId));

  await batch.commit();
}

/* =========================================================
   JOIN / LEAVE
========================================================= */

export async function joinCommunity(communityId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const already = await fetchIsMember(communityId);
  if (already) return;

  const batch = db.batch();

  const memberRef = db.collection("community_members").doc();
  batch.set(memberRef, {
    user_id: user.uid,
    community_id: communityId,
    role: "member",
    created_at: firestore.FieldValue.serverTimestamp(),
  });

  const communityRef = db.collection("communities").doc(communityId);
  const communitySnap = await communityRef.get();
  const current = (communitySnap.data() as any)?.member_count ?? 0;
  batch.update(communityRef, {
    member_count: current + 1,
    updated_at: firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
}

export async function leaveCommunity(communityId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const snap = await db
    .collection("community_members")
    .where("community_id", "==", communityId)
    .where("user_id", "==", user.uid)
    .limit(1)
    .get();

  if (snap.empty) return;

  const batch = db.batch();

  batch.delete(snap.docs[0].ref);

  const communityRef = db.collection("communities").doc(communityId);
  const communitySnap = await communityRef.get();
  const current = (communitySnap.data() as any)?.member_count ?? 1;
  batch.update(communityRef, {
    member_count: Math.max(0, current - 1),
    updated_at: firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
}
