// lib/queries/mySupport.ts — FIRESTORE ✅

import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import {
  collection,
  getDocs,
  limit as lim,
  orderBy,
  query,
  where,
} from "firebase/firestore";

const auth = getAuth();

export async function getMySupportReports(limit = 50, offset = 0) {
  // Firestore doesn’t support offset paging efficiently; use cursor paging later.
  // For now we fetch a little extra and slice.
  const user = auth.currentUser;
  if (!user) return [];

  const snap = await getDocs(
    query(
      collection(db, "support_reports"),
      where("user_id", "==", user.uid),
      orderBy("created_at", "desc"),
      lim(Math.min(200, offset + limit)),
    ),
  );

  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return rows.slice(offset, offset + limit);
}
