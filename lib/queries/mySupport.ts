// lib/queries/mySupport.ts
import { supabase } from "@/lib/supabase";

export async function getMySupportReports(limit = 50, offset = 0) {
  const { data, error } = await supabase
    .from("support_reports")
    .select(
      `
      id,
      subject,
      details,
      screenshot_bucket,
      screenshot_path,
      created_at,
      status,
      admin_note
    `,
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}
