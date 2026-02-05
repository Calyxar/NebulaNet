// lib/queries/adminSupport.ts
import { supabase } from "@/lib/supabase";

export type SupportProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
};

type EmbeddedProfile = SupportProfile | SupportProfile[] | null;

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

  // Raw embed (can be object or array depending on relationship shape)
  profiles?: EmbeddedProfile;

  // Normalized single profile for UI
  profile: SupportProfile | null;

  // Optional if you add it later
  status?: "open" | "resolved";
};

function normalizeProfile(p: EmbeddedProfile): SupportProfile | null {
  if (!p) return null;
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
}

export async function adminGetSupportReports(limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from("support_reports")
    .select(
      `
      id,
      subject,
      details,
      screenshot_bucket,
      screenshot_path,
      app_version,
      platform,
      device_name,
      os_version,
      created_at,
      status,
      profiles:profiles!support_reports_user_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `,
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Strongly type the raw rows
  const rows = (data ?? []) as (Omit<SupportReportRow, "profile"> & { profiles?: EmbeddedProfile })[];

  // Normalize profiles -> profile (single object)
  const normalized: SupportReportRow[] = rows.map((r) => ({
    ...r,
    profile: normalizeProfile(r.profiles ?? null),
  }));

  return normalized;
}

export async function adminGetScreenshotSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 90,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  return data?.signedUrl ?? null;
}

// Optional: status update (used by the dashboard "Mark resolved")
export async function adminUpdateSupportReportStatus(
  reportId: string,
  status: "open" | "resolved",
) {
  const { error } = await supabase
    .from("support_reports")
    .update({ status })
    .eq("id", reportId);

  if (error) throw error;
  return true;
}
