// lib/firestore/boosts.ts ✅ FIXED
// ✅ FIXED: this file was written against the Web/modular Firebase SDK
// (collection/addDoc/query/where from "firebase/firestore"), but `db`
// (from @/lib/firebase) is a real @react-native-firebase/firestore
// namespaced instance (`rnFirestore()`) — the SAME SDK every other file
// in this codebase uses. These two APIs are structurally incompatible;
// that's exactly what "db's type is Module, not Firestore" meant — that
// IS React Native Firebase's own internal type name, not a sign
// lib/firebase.ts's export was broken. Rewritten to the namespaced
// instance-method style (db.collection(...).where(...).get()) matching
// every other file in this project. All types/interfaces are unchanged.

import { auth, db } from "@/lib/firebase";
import firestore from "@react-native-firebase/firestore";

export type BoostObjective = "engagement" | "profile_visits" | "website_clicks";
export type BoostStatus = "active" | "completed" | "cancelled" | "pending";

export interface Boost {
  id: string;
  post_id: string;
  user_id: string;
  objective: BoostObjective;
  daily_budget: number;
  duration_days: number;
  total_amount: number;
  destination_url?: string;
  audience: "auto" | "custom";
  status: BoostStatus;
  starts_at: string;
  ends_at: string;
  created_at: string;
  revenuecat_product_id: string;
  revenuecat_transaction_id?: string;
}

export interface CreateBoostData {
  post_id: string;
  objective: BoostObjective;
  daily_budget: number;
  duration_days: number;
  total_amount: number;
  destination_url?: string;
  audience: "auto" | "custom";
  revenuecat_product_id: string;
  revenuecat_transaction_id?: string;
}

const BOOSTS = db.collection("boosts");

export async function createBoost(data: CreateBoostData): Promise<Boost> {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const now = new Date();
  const endsAt = new Date(now.getTime() + data.duration_days * 86400000);

  const ref = await BOOSTS.add({
    ...data,
    user_id: viewer.uid,
    status: "active",
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    created_at: now.toISOString(),
    created_at_ts: firestore.FieldValue.serverTimestamp(),
  });

  const snap = await ref.get();
  return { id: snap.id, ...(snap.data() as Omit<Boost, "id">) };
}

export async function getActiveBoostsPostIds(): Promise<string[]> {
  const now = new Date().toISOString();
  const snap = await BOOSTS.where("status", "==", "active")
    .where("ends_at", ">", now)
    .get();
  return snap.docs.map((d) => (d.data() as Boost).post_id);
}

export async function getActiveBoostForPost(
  postId: string,
): Promise<Boost | null> {
  const snap = await BOOSTS.where("post_id", "==", postId)
    .where("status", "==", "active")
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Boost, "id">) };
}

export async function getMyBoosts(): Promise<Boost[]> {
  const viewer = auth.currentUser;
  if (!viewer) return [];
  const snap = await BOOSTS.where("user_id", "==", viewer.uid).get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Boost, "id">),
  }));
}

export async function cancelBoost(boostId: string): Promise<void> {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");
  const ref = db.collection("boosts").doc(boostId);
  const snap = await ref.get();
  if (!snap.exists()) throw new Error("Boost not found");
  const data = snap.data() as Boost;
  if (data.user_id !== viewer.uid) throw new Error("Not allowed");
  await ref.update({ status: "cancelled" });
}
