// lib/firestore/communityRules.ts

import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

export type CommunityRule = {
  id: string;
  community_id: string;
  text: string;
  order: number;
  created_at: string;
};

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof firestore.Timestamp) return ts.toDate().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();

  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/* =========================================================
   FETCH RULES
========================================================= */

export async function fetchCommunityRules(
  communityId: string,
): Promise<CommunityRule[]> {
  const snap = await db
    .collection("community_rules")
    .where("community_id", "==", communityId)
    .orderBy("order", "asc")
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() as any;

    return {
      id: doc.id,
      community_id: data.community_id,
      text: data.text ?? "",
      order: data.order ?? 0,
      created_at: tsToIso(data.created_at),
    };
  });
}

/* =========================================================
   CREATE RULE
========================================================= */

export async function createCommunityRule(
  communityId: string,
  text: string,
  order: number,
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Not authenticated");
  }

  return db.collection("community_rules").add({
    community_id: communityId,
    text: text.trim(),
    order,
    created_at: firestore.FieldValue.serverTimestamp(),
  });
}

/* =========================================================
   UPDATE RULE
========================================================= */

export async function updateCommunityRule(
  ruleId: string,
  updates: {
    text?: string;
    order?: number;
  },
) {
  return db.collection("community_rules").doc(ruleId).update(updates);
}

/* =========================================================
   DELETE RULE
========================================================= */

export async function deleteCommunityRule(ruleId: string) {
  return db.collection("community_rules").doc(ruleId).delete();
}
