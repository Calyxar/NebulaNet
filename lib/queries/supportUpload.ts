// lib/queries/supportUpload.ts — FIREBASE STORAGE ✅

import { getStorage, ref, uploadBytes } from "firebase/storage";

const storage = getStorage();

export async function uploadSupportScreenshot(params: {
  uri: string;
  userId: string;
  reportId: string;
}) {
  const { uri, userId, reportId } = params;

  const path = `support-screenshots/${userId}/support/${reportId}.jpg`;

  const resp = await fetch(uri);
  const blob = await resp.blob();

  await uploadBytes(ref(storage, path), blob, {
    contentType: "image/jpeg",
  });

  return { bucket: "support-screenshots", path };
}
