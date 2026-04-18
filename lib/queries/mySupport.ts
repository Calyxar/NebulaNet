// lib/queries/mySupport.ts — FIRESTORE ✅

import { auth, db } from "@/lib/firebase";

export async function getMySupportReports(limit = 50, offset = 0) {
  const user = auth.currentUser;
  if (!user) return [];

  const snap = await db
    .collection("support_reports")
    .where("user_id", "==", user.uid)
    .orderBy("created_at", "desc")
    .limit(Math.min(200, offset + limit))
    .get();

  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  return rows.slice(offset, offset + limit);
}
