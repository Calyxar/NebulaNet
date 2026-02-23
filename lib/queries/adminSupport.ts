// lib/queries/adminSupport.ts — FIRESTORE ✅ MIGRATED FROM SUPABASE

import { db, storage } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as lim,
  orderBy,
  query,
  Timestamp,
  updateDoc,
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
  screenshot_bucket: string | null;
  screenshot_path: string | null;
  app_version: string | null;
  platform: string | null;
  device_name: string | null;
  os_version: string | null;
  created_at: string;
  profile: SupportProfile | null;
  status?: "open" | "resolved";
};

/* -------------------- HELPERS -------------------- */

function tsToIso(ts: any): string {
  if (!ts) return "";
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

/* -------------------- QUERIES -------------------- */

export async function adminGetSupportReports(
  limitCount = 50,
  offset = 0,
): Promise<SupportReportRow[]> {
  const snap = await getDocs(
    query(
      collection(db, "support_reports"),
      orderBy("created_at", "desc"),
      lim(Math.min(500, offset + limitCount)),
    ),
  );

  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  const paged = rows.slice(offset, offset + limitCount);

  // Fetch profiles for each report
  const results: SupportReportRow[] = await Promise.all(
    paged.map(async (r) => {
      let profile: SupportProfile | null = null;

      if (r.user_id) {
        try {
          const profileSnap = await getDoc(doc(db, "profiles", r.user_id));
          if (profileSnap.exists()) {
            const p = profileSnap.data() as any;
            profile = {
              id: profileSnap.id,
              username: p.username ?? "",
              full_name: p.full_name ?? null,
              avatar_url: p.avatar_url ?? null,
            };
          }
        } catch {
          // profile not found, leave null
        }
      }

      return {
        id: r.id,
        subject: r.subject ?? "",
        details: r.details ?? "",
        screenshot_bucket: r.screenshot_bucket ?? null,
        screenshot_path: r.screenshot_path ?? null,
        app_version: r.app_version ?? null,
        platform: r.platform ?? null,
        device_name: r.device_name ?? null,
        os_version: r.os_version ?? null,
        created_at: tsToIso(r.created_at),
        status: r.status ?? "open",
        profile,
      };
    }),
  );

  return results;
}

export async function adminGetScreenshotSignedUrl(
  bucket: string,
  path: string,
): Promise<string | null> {
  // Firebase Storage uses getDownloadURL (permanent URL, no expiry needed)
  try {
    const url = await getDownloadURL(ref(storage, path));
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
