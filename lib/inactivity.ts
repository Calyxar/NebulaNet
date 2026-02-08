import { supabase } from "@/lib/supabase";
import { AppState, type AppStateStatus } from "react-native";

const LAST_ACTIVE_KEY = "nebulanet:last_active_ms";

// pick what you want (example: 2 hours)
const INACTIVITY_LIMIT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

let currentState: AppStateStatus = AppState.currentState;

async function saveLastActiveNow() {
  try {
    // AsyncStorage is already used by supabase internally, but we can import it directly too.
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    await AsyncStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
  } catch {}
}

async function getLastActiveMs(): Promise<number | null> {
  try {
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    const v = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function checkAndLogoutIfInactive() {
  const last = await getLastActiveMs();
  if (!last) return;

  const diff = Date.now() - last;
  if (diff >= INACTIVITY_LIMIT_MS) {
    // sign out after inactivity
    await supabase.auth.signOut();
  }
}

export function startInactivityWatcher() {
  // initial mark
  saveLastActiveNow();

  const sub = AppState.addEventListener("change", async (nextState) => {
    // going background -> record timestamp
    if (currentState === "active" && nextState.match(/inactive|background/)) {
      await saveLastActiveNow();
    }

    // coming back -> check how long gone
    if (currentState.match(/inactive|background/) && nextState === "active") {
      await checkAndLogoutIfInactive();
      await saveLastActiveNow();
    }

    currentState = nextState;
  });

  return () => sub.remove();
}
