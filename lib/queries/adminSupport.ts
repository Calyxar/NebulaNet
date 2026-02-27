// lib/queries/adminSupport.ts — COMPLETED + UPDATED ✅
// ✅ Cursor-based pagination (no offset)
// ✅ Uses created_at_ts when present (fallback to created_at)
// ✅ Storage getDownloadURL for screenshot_path (bucket ignored)
// ✅ Safe null returns when rules block access

import { db, storage } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";

/* -------------------- TYPES -------------------- */

export type SupportProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type SupportReportRow = {
  id: string;
  subject: string;
  details: string;

  // keep fields if already in DB
  screenshot_bucket: string | null; // ignored by Firebase Storage, kept for compatibility
  screenshot_path: string | null;

  app_version: string | null;
  platform: string | null;
  device_name: string | null;
  os_version: string | null;

  created_at: string;

  profile: SupportProfile | null;
  status?: "open" | "resolved";

  // cursor helpers
  _cursor?: QueryDocumentSnapshot<DocumentData>;
};

/* -------------------- HELPERS -------------------- */

function tsToIso(v: any): string {
  if (!v) return "";
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  }
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v?.toDate === "function") return v.toDate().toISOString();

  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

async function fetchProfile(uid: string): Promise<SupportProfile | null> {
  try {
    const snap = await getDoc(doc(db, "profiles", uid));
    if (!snap.exists()) return null;

    const p = snap.data() as any;
    return {
      id: snap.id,
      username: p.username ?? "",
      full_name: p.full_name ?? null,
      avatar_url: p.avatar_url ?? null,
    };
  } catch {
    return null;
  }
}

/* -------------------- QUERIES -------------------- */

/**
 * Cursor-based pagination:
 * - First call: adminGetSupportReports({ pageSize: 50 })
 * - Next call: adminGetSupportReports({ pageSize: 50, cursor: last._cursor })
 */
export async function adminGetSupportReports(params?: {
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
}): Promise<SupportReportRow[]> {
  const pageSize = Math.min(200, Math.max(1, params?.pageSize ?? 50));
  const cursor = params?.cursor ?? null;

  // Prefer created_at_ts if you have it in docs, else created_at.
  // We can only order by one field at a time. If some docs don't have created_at_ts,
  // you should backfill it. For now we order by created_at (string/timestamp),
  // but if your support_reports uses created_at_ts, switch to that below.
  //
  // ✅ Recommended: orderBy("created_at_ts", "desc")
  const base = query(
    collection(db, "support_reports"),
    orderBy("created_at_ts", "desc"),
    limit(pageSize),
  );

  const qy = cursor ? query(base, startAfter(cursor)) : base;

  const snap = await getDocs(qy);

  const results: SupportReportRow[] = await Promise.all(
    snap.docs.map(async (d) => {
      const r = d.data() as any;

      const uid = r.user_id as string | undefined;
      const profile = uid ? await fetchProfile(uid) : null;

      const created = tsToIso(r.created_at_ts) || tsToIso(r.created_at) || "";

      return {
        id: d.id,
        subject: r.subject ?? "",
        details: r.details ?? "",
        screenshot_bucket: r.screenshot_bucket ?? null,
        screenshot_path: r.screenshot_path ?? null,
        app_version: r.app_version ?? null,
        platform: r.platform ?? null,
        device_name: r.device_name ?? null,
        os_version: r.os_version ?? null,
        created_at: created,
        status: (r.status as "open" | "resolved" | undefined) ?? "open",
        profile,
        _cursor: d,
      };
    }),
  );

  return results;
}

/**
 * Firebase Storage: returns a download URL if rules allow reads.
 * Returns null if blocked.
 */
export async function adminGetScreenshotUrl(
  screenshotPath: string | null | undefined,
): Promise<string | null> {
  if (!screenshotPath) return null;

  try {
    const url = await getDownloadURL(ref(storage, screenshotPath));
    return url;
  } catch {
    return null;
  }
}

export async function adminUpdateSupportReportStatus(
  reportId: string,
  status: "open" | "resolved",
): Promise<boolean> {
  await updateDoc(doc(db, "support_reports", reportId), { status });
  return true;
}
