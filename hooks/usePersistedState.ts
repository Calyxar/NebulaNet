import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";

export function usePersistedState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isReady, setIsReady] = useState(false);
  const didLoad = useRef(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!mounted) return;

        if (raw != null) setValue(JSON.parse(raw) as T);
      } catch {
        // ignore
      } finally {
        if (mounted) {
          didLoad.current = true;
          setIsReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [key]);

  useEffect(() => {
    if (!didLoad.current) return;
    AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
  }, [key, value]);

  return { value, setValue, isReady };
}
