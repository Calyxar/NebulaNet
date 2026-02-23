// lib/firestore/deleteAccount.ts

import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";

export async function deleteAccountRequest() {
  const callable = httpsCallable(functions, "deleteAccount");
  const result = await callable();
  return result.data as { success: boolean; message: string };
}
