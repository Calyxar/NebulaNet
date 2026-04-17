// lib/queries/supportUpload.ts — React Native Firebase ✅

import storage from "@react-native-firebase/storage";

export async function uploadSupportScreenshot(params: {
  uri: string;
  userId: string;
  reportId: string;
}) {
  const { uri, userId, reportId } = params;

  const path = `support-screenshots/${userId}/support/${reportId}.jpg`;

  await storage().ref(path).putFile(uri, { contentType: "image/jpeg" });

  return { bucket: "support-screenshots", path };
}
