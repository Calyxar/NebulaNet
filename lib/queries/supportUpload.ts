import { supabase } from "@/lib/supabase";

const BUCKET = "support-screenshots";

export async function uploadSupportScreenshot(params: {
  uri: string;
  userId: string;
  reportId: string;
}) {
  const { uri, userId, reportId } = params;

  // Keep it simple: jpg path; you can detect mime if you want
  const path = `${userId}/support/${reportId}.jpg`;

  const resp = await fetch(uri);
  const blob = await resp.blob();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      upsert: true,
      contentType: "image/jpeg",
    });

  if (uploadError) throw uploadError;

  return { bucket: BUCKET, path };
}
