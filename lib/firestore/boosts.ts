// lib/firestore/boosts.ts
import { auth, db } from "@/lib/firebase";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";

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

const BOOSTS = collection(db, "boosts");

export async function createBoost(data: CreateBoostData): Promise<Boost> {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const now = new Date();
  const endsAt = new Date(now.getTime() + data.duration_days * 86400000);

  const ref = await addDoc(BOOSTS, {
    ...data,
    user_id: viewer.uid,
    status: "active",
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    created_at: now.toISOString(),
    created_at_ts: serverTimestamp(),
  });

  const snap = await getDoc(ref);
  return { id: snap.id, ...(snap.data() as Omit<Boost, "id">) };
}

export async function getActiveBoostsPostIds(): Promise<string[]> {
  const now = new Date().toISOString();
  const q = query(
    BOOSTS,
    where("status", "==", "active"),
    where("ends_at", ">", now),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => (d.data() as Boost).post_id);
}

export async function getActiveBoostForPost(
  postId: string,
): Promise<Boost | null> {
  const q = query(
    BOOSTS,
    where("post_id", "==", postId),
    where("status", "==", "active"),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Boost, "id">) };
}

export async function getMyBoosts(): Promise<Boost[]> {
  const viewer = auth.currentUser;
  if (!viewer) return [];
  const q = query(BOOSTS, where("user_id", "==", viewer.uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Boost, "id">),
  }));
}

export async function cancelBoost(boostId: string): Promise<void> {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");
  const ref = doc(db, "boosts", boostId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Boost not found");
  const data = snap.data() as Boost;
  if (data.user_id !== viewer.uid) throw new Error("Not allowed");
  await updateDoc(ref, { status: "cancelled" });
}
