// lib/firestore/presence.ts — FIREBASE PRESENCE ✅
// Uses Realtime Database for true presence
// Mirrors last_seen into Firestore

import { db } from "@/lib/firebase";
import {
    getDatabase,
    onDisconnect,
    onValue,
    ref,
    serverTimestamp,
    set,
} from "firebase/database";
import { doc, updateDoc } from "firebase/firestore";

const rtdb = getDatabase();

export function initPresence(userId: string) {
  if (!userId) return;

  const userStatusRef = ref(rtdb, `/status/${userId}`);
  const connectedRef = ref(rtdb, ".info/connected");

  onValue(connectedRef, async (snap) => {
    if (!snap.val()) return;

    await onDisconnect(userStatusRef).set({
      state: "offline",
      last_changed: serverTimestamp(),
    });

    await set(userStatusRef, {
      state: "online",
      last_changed: serverTimestamp(),
    });

    // mirror last seen into Firestore
    await updateDoc(doc(db, "profiles", userId), {
      last_seen: new Date(),
    });
  });
}
