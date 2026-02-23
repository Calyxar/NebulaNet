// lib/firestore/communities.ts — FIRESTORE ✅
// Matches Supabase schema:
// communities: id, name, description, image_url, member_count, created_at, updated_at, slug, owner_id
// community_members: id, user_id, community_id, role, created_at

import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
    writeBatch
} from "firebase/firestore";

const auth = getAuth();

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
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
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

// Get all communities (latest first)
export async function fetchAllCommunities(
  limitCount = 50,
): Promise<Community[]> {
  const snap = await getDocs(
    query(
      collection(db, "communities"),
      orderBy("created_at", "desc"),
      limit(limitCount),
    ),
  );

  return snap.docs.map((d) => docToCommunity(d.data(), d.id));
}

// Get a single community by Firestore doc ID
export async function fetchCommunityById(
  id: string,
): Promise<Community | null> {
  const snap = await getDoc(doc(db, "communities", id));
  if (!snap.exists()) return null;
  return docToCommunity(snap.data(), snap.id);
}

// Get a single community by slug
export async function fetchCommunityBySlug(
  slug: string,
): Promise<Community | null> {
  const snap = await getDocs(
    query(collection(db, "communities"), where("slug", "==", slug), limit(1)),
  );

  if (snap.empty) return null;
  return docToCommunity(snap.docs[0].data(), snap.docs[0].id);
}

// Get communities the current user has joined or created
export async function fetchMyCommunities(): Promise<Community[]> {
  const user = auth.currentUser;
  if (!user) return [];

  // 1) Communities user is a member of
  const memberSnap = await getDocs(
    query(
      collection(db, "community_members"),
      where("user_id", "==", user.uid),
      limit(500),
    ),
  );

  const joinedIds = memberSnap.docs
    .map((d) => (d.data() as any).community_id as string)
    .filter(Boolean);

  // 2) Communities user owns
  const ownedSnap = await getDocs(
    query(
      collection(db, "communities"),
      where("owner_id", "==", user.uid),
      orderBy("created_at", "desc"),
      limit(200),
    ),
  );

  const ownedRows = ownedSnap.docs.map((d) => docToCommunity(d.data(), d.id));

  // 3) Fetch joined community docs (chunked, max 10 per query)
  const joinedRows: Community[] = [];
  for (let i = 0; i < joinedIds.length; i += 10) {
    const batch = joinedIds.slice(i, i + 10);
    const snap = await getDocs(
      query(collection(db, "communities"), where("__name__", "in", batch)),
    );
    snap.docs.forEach((d) => joinedRows.push(docToCommunity(d.data(), d.id)));
  }

  // 4) Merge + dedupe
  const map = new Map<string, Community>();
  [...ownedRows, ...joinedRows].forEach((c) => map.set(c.id, c));

  return Array.from(map.values());
}

// Get members of a community
export async function fetchCommunityMembers(
  communityId: string,
): Promise<CommunityMember[]> {
  const snap = await getDocs(
    query(
      collection(db, "community_members"),
      where("community_id", "==", communityId),
      orderBy("created_at", "asc"),
    ),
  );

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

// Check if current user is a member
export async function fetchIsMember(communityId: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  const snap = await getDocs(
    query(
      collection(db, "community_members"),
      where("community_id", "==", communityId),
      where("user_id", "==", user.uid),
      limit(1),
    ),
  );

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

  // Check slug is unique
  const existing = await fetchCommunityBySlug(data.slug);
  if (existing) throw new Error("A community with this slug already exists");

  const docRef = await addDoc(collection(db, "communities"), {
    name: data.name.trim(),
    description: data.description ?? null,
    image_url: data.image_url ?? null,
    slug: data.slug.trim(),
    owner_id: user.uid,
    member_count: 1,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  // Auto-join creator as owner
  await addDoc(collection(db, "community_members"), {
    user_id: user.uid,
    community_id: docRef.id,
    role: "owner",
    created_at: serverTimestamp(),
  });

  const snap = await getDoc(docRef);
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
  await updateDoc(doc(db, "communities", communityId), {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

/* =========================================================
   DELETE
========================================================= */

export async function deleteCommunity(communityId: string): Promise<void> {
  const batch = writeBatch(db);

  // Delete all members
  const memberSnap = await getDocs(
    query(
      collection(db, "community_members"),
      where("community_id", "==", communityId),
    ),
  );
  memberSnap.docs.forEach((d) => batch.delete(d.ref));

  // Delete community doc
  batch.delete(doc(db, "communities", communityId));

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

  const batch = writeBatch(db);

  // Add member doc
  const memberRef = doc(collection(db, "community_members"));
  batch.set(memberRef, {
    user_id: user.uid,
    community_id: communityId,
    role: "member",
    created_at: serverTimestamp(),
  });

  // Increment member_count
  const communityRef = doc(db, "communities", communityId);
  const communitySnap = await getDoc(communityRef);
  const current = (communitySnap.data() as any)?.member_count ?? 0;
  batch.update(communityRef, {
    member_count: current + 1,
    updated_at: serverTimestamp(),
  });

  await batch.commit();
}

export async function leaveCommunity(communityId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const snap = await getDocs(
    query(
      collection(db, "community_members"),
      where("community_id", "==", communityId),
      where("user_id", "==", user.uid),
      limit(1),
    ),
  );

  if (snap.empty) return;

  const batch = writeBatch(db);

  // Remove member doc
  batch.delete(snap.docs[0].ref);

  // Decrement member_count
  const communityRef = doc(db, "communities", communityId);
  const communitySnap = await getDoc(communityRef);
  const current = (communitySnap.data() as any)?.member_count ?? 1;
  batch.update(communityRef, {
    member_count: Math.max(0, current - 1),
    updated_at: serverTimestamp(),
  });

  await batch.commit();
}
