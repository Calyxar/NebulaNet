// lib/queries/adminSupport.ts — React Native Firebase ✅
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";

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

  _cursor?: FirebaseFirestoreTypes.QueryDocumentSnapshot;
};

function tsToIso(v: any): string {
  if (!v) return "";
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  }
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  if (v?.seconds) return new Date(v.seconds * 1000).toISOString();

  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

async function fetchProfile(uid: string): Promise<SupportProfile | null> {
  try {
    const snap = await firestore().collection("profiles").doc(uid).get();
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

export async function adminGetSupportReports(params?: {
  pageSize?: number;
  cursor?: FirebaseFirestoreTypes.QueryDocumentSnapshot | null;
}): Promise<SupportReportRow[]> {
  const pageSize = Math.min(200, Math.max(1, params?.pageSize ?? 50));
  const cursor = params?.cursor ?? null;

  let q: FirebaseFirestoreTypes.Query = firestore()
    .collection("support_reports")
    .orderBy("created_at_ts", "desc");

  if (cursor) q = q.startAfter(cursor);
  q = q.limit(pageSize);

  const snap = await q.get();

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

export async function adminGetScreenshotUrl(
  screenshotPath: string | null | undefined,
): Promise<string | null> {
  if (!screenshotPath) return null;

  try {
    const url = await storage().ref(screenshotPath).getDownloadURL();
    return url;
  } catch {
    return null;
  }
}

export async function adminUpdateSupportReportStatus(
  reportId: string,
  status: "open" | "resolved",
): Promise<boolean> {
  await firestore()
    .collection("support_reports")
    .doc(reportId)
    .update({ status });
  return true;
}
