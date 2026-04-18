// lib/firestore/deleteAccount.ts

import { functions } from "@/lib/firebase";

export async function deleteAccountRequest() {
  const result = await functions.httpsCallable("deleteAccount")();
  return result.data as { success: boolean; message: string };
}
