// hooks/useTyping.ts — FIRESTORE VERSION ✅ (COMPLETED + UPDATED)
// ✅ Drops Supabase typing_status table
// ✅ Uses Firestore conversation doc field: typing.{userId} = boolean
// ✅ Uses chatSubscriptions.subscribeToTypingStatus for realtime
// ✅ Keeps SAME API: { typingUserIds, isSomeoneTyping, setTyping() }
// ✅ Debounced stop-typing + auto-expire other users after 4.5s

import { chatQueries, chatSubscriptions } from "@/lib/firestore/chat";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TypingMap = Record<string, boolean | null | undefined>;

export function useTyping(conversationId?: string, myUserId?: string) {
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  // timers for other users' typing expiry (UI stability)
  const expiryTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // timer for my own "stop typing" debounce
  const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enabled = useMemo(
    () => !!conversationId && !!myUserId,
    [conversationId, myUserId],
  );

  const clearExpiryTimer = (userId: string) => {
    const t = expiryTimersRef.current.get(userId);
    if (t) {
      clearTimeout(t);
      expiryTimersRef.current.delete(userId);
    }
  };

  const markTyping = (userId: string, isTyping: boolean) => {
    if (!userId || userId === myUserId) return;

    setTypingUserIds((prev) => {
      const s = new Set(prev);
      if (isTyping) s.add(userId);
      else s.delete(userId);
      return Array.from(s);
    });

    // auto-expire typing after 4.5s (in case we miss the "false" state)
    clearExpiryTimer(userId);
    if (isTyping) {
      const t = setTimeout(() => {
        setTypingUserIds((prev) => prev.filter((id) => id !== userId));
        clearExpiryTimer(userId);
      }, 4500);
      expiryTimersRef.current.set(userId, t);
    }
  };

  // ✅ THIS is what ChatInput expects
  // Note: In Firestore chat.ts, updateTypingStatus writes:
  // - is_typing boolean (compat)
  // - typing.{uid} boolean (best)
  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!enabled) return;

      // Debounce "stop typing"
      if (!isTyping) {
        if (stopTypingTimerRef.current) {
          clearTimeout(stopTypingTimerRef.current);
          stopTypingTimerRef.current = null;
        }

        stopTypingTimerRef.current = setTimeout(async () => {
          try {
            await chatQueries.updateTypingStatus(conversationId!, false);
          } catch {
            // ignore
          }
        }, 900);

        return;
      }

      // Immediate "start typing"
      try {
        await chatQueries.updateTypingStatus(conversationId!, true);
      } catch {
        // ignore
      }
    },
    [enabled, conversationId],
  );

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    // Boot: read current conversation typing map once
    const boot = async () => {
      try {
        const { data } = await chatQueries.getConversation(conversationId!);
        if (!mounted || !data) return;

        const typing: TypingMap = (data as any)?.typing ?? {};
        for (const [uid, v] of Object.entries(typing || {})) {
          if (v) markTyping(uid, true);
        }

        // Back-compat: if you ever used a single boolean is_typing,
        // we CANNOT know who is typing from that field, so we ignore it here.
      } catch {
        // ignore
      }
    };

    boot();

    // Realtime: listen to conversation doc changes
    const unsub = chatSubscriptions.subscribeToTypingStatus(
      conversationId!,
      (payload: any) => {
        const doc = payload?.new;
        if (!doc) return;

        const typing: TypingMap = doc.typing ?? {};

        // Update all "true" users first (to refresh expiry timers)
        for (const [uid, v] of Object.entries(typing || {})) {
          if (!!v) markTyping(uid, true);
        }

        // Then remove anyone who is now false (or missing) from our local list
        setTypingUserIds((prev) => {
          const next = prev.filter((uid) => !!typing?.[uid]);
          // clear timers for removed
          for (const uid of prev) {
            if (!typing?.[uid]) clearExpiryTimer(uid);
          }
          return next;
        });
      },
    );

    return () => {
      mounted = false;

      unsub?.();

      if (stopTypingTimerRef.current) {
        clearTimeout(stopTypingTimerRef.current);
        stopTypingTimerRef.current = null;
      }

      for (const [, t] of expiryTimersRef.current) clearTimeout(t);
      expiryTimersRef.current.clear();

      setTypingUserIds([]);
    };
  }, [enabled, conversationId, myUserId]);

  return {
    typingUserIds,
    isSomeoneTyping: typingUserIds.length > 0,
    setTyping,
  };
}
