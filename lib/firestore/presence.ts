// lib/firestore/presence.ts — FIREBASE PRESENCE ✅
// Uses Realtime Database (native @react-native-firebase/database) for true presence.
// Mirrors last_seen into Firestore profiles doc.
// Respects the user's existing `activity_status` privacy setting
// (lib/queries/privacy.ts) — presence only goes online if the user
// has activity_status enabled (default: true).

import { db } from "@/lib/firebase";
import database from "@react-native-firebase/database";
import firestore from "@react-native-firebase/firestore";

let activeListener: (() => void) | null = null;
let settingsUnsub: (() => void) | null = null;

async function getActivityStatusEnabled(userId: string): Promise<boolean> {
  try {
    const snap = await db.collection("user_privacy_settings").doc(userId).get();
    if (!snap.exists()) return true; // matches DEFAULT_PRIVACY_SETTINGS
    const data = snap.data();
    return data?.activity_status !== false;
  } catch {
    return true; // fail open to default rather than silently breaking presence
  }
}

async function goOnline(userId: string) {
  const userStatusRef = database().ref(`/status/${userId}`);
  try {
    await userStatusRef.onDisconnect().set({
      state: "offline",
      last_changed: database.ServerValue.TIMESTAMP,
    });
    await userStatusRef.set({
      state: "online",
      last_changed: database.ServerValue.TIMESTAMP,
    });
    await db.collection("profiles").doc(userId).update({
      last_seen: firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.warn("presence: failed to set online status", err);
  }
}

async function goOffline(userId: string) {
  try {
    // Cancel the pending onDisconnect write too, since we're going
    // offline voluntarily (privacy toggle), not via actual disconnect.
    await database().ref(`/status/${userId}`).onDisconnect().cancel();
    await database().ref(`/status/${userId}`).set({
      state: "offline",
      last_changed: database.ServerValue.TIMESTAMP,
    });
  } catch (err) {
    console.warn("presence: failed to set offline status", err);
  }
}

export function initPresence(userId: string) {
  if (!userId) return;

  // Avoid double-registering if called more than once for the same session.
  if (activeListener) {
    activeListener();
    activeListener = null;
  }
  if (settingsUnsub) {
    settingsUnsub();
    settingsUnsub = null;
  }

  const connectedRef = database().ref(".info/connected");

  const callback = connectedRef.on("value", async (snap) => {
    if (!snap.val()) return;
    const enabled = await getActivityStatusEnabled(userId);
    if (enabled) {
      await goOnline(userId);
    }
  });

  activeListener = () => connectedRef.off("value", callback);

  // Watch for the user toggling activity_status off/on *while logged in*,
  // and flip presence live to match — not just at next app launch.
  settingsUnsub = db
    .collection("user_privacy_settings")
    .doc(userId)
    .onSnapshot((snap) => {
      const enabled = snap.data()?.activity_status !== false;
      if (enabled) {
        goOnline(userId);
      } else {
        goOffline(userId);
      }
    });
}

/** Call on sign-out to stop listening and mark the user offline immediately. */
export async function teardownPresence(userId: string) {
  if (activeListener) {
    activeListener();
    activeListener = null;
  }
  if (settingsUnsub) {
    settingsUnsub();
    settingsUnsub = null;
  }
  if (!userId) return;
  try {
    await database().ref(`/status/${userId}`).onDisconnect().cancel();
    await database().ref(`/status/${userId}`).set({
      state: "offline",
      last_changed: database.ServerValue.TIMESTAMP,
    });
  } catch (err) {
    console.warn("presence: failed to set offline status on sign-out", err);
  }
}
