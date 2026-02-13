// hooks/useTyping.ts — COMPLETED + UPDATED
// ✅ Fixes implicit any
// ✅ Cross-platform timeout typing
// ✅ Provides setTyping() for ChatInput.tsx
// ✅ Realtime typingUserIds + isSomeoneTyping

import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TypingPayload = {
  new?: {
    conversation_id?: string | null;
    user_id?: string | null;
    is_typing?: boolean | null;
    updated_at?: string | null;
  };
  old?: {
    conversation_id?: string | null;
    user_id?: string | null;
    is_typing?: boolean | null;
    updated_at?: string | null;
  };
};

type TypingRow = {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  updated_at?: string | null;
};

const TABLE = "typing_status"; // <-- change if your table name differs

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

  const markTyping = (row: TypingRow) => {
    // never show me as "typing" in the UI list
    if (!row.user_id || row.user_id === myUserId) return;

    setTypingUserIds((prev) => {
      const s = new Set(prev);
      if (row.is_typing) s.add(row.user_id);
      else s.delete(row.user_id);
      return Array.from(s);
    });

    // auto-expire typing after 4.5s (in case we miss the "false" event)
    clearExpiryTimer(row.user_id);
    if (row.is_typing) {
      const t = setTimeout(() => {
        setTypingUserIds((prev) => prev.filter((id) => id !== row.user_id));
        clearExpiryTimer(row.user_id);
      }, 4500);
      expiryTimersRef.current.set(row.user_id, t);
    }
  };

  // ✅ THIS is what ChatInput expects
  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!enabled) return;

      // Debounce "stop typing" so we don't spam DB while user pauses
      if (!isTyping) {
        if (stopTypingTimerRef.current) {
          clearTimeout(stopTypingTimerRef.current);
          stopTypingTimerRef.current = null;
        }

        stopTypingTimerRef.current = setTimeout(async () => {
          try {
            await supabase.from(TABLE).upsert(
              {
                conversation_id: conversationId!,
                user_id: myUserId!,
                is_typing: false,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "conversation_id,user_id" },
            );
          } catch {
            // ignore
          }
        }, 900);

        return;
      }

      // Immediate "start typing"
      try {
        await supabase.from(TABLE).upsert(
          {
            conversation_id: conversationId!,
            user_id: myUserId!,
            is_typing: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "conversation_id,user_id" },
        );
      } catch {
        // ignore
      }
    },
    [enabled, conversationId, myUserId],
  );

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const boot = async () => {
      try {
        const { data, error } = await supabase
          .from(TABLE)
          .select("conversation_id,user_id,is_typing,updated_at")
          .eq("conversation_id", conversationId!)
          .neq("user_id", myUserId!)
          .eq("is_typing", true);

        if (error) throw error;
        if (!mounted) return;

        (data as TypingRow[] | null)?.forEach((r) => markTyping(r));
      } catch {
        // ignore
      }
    };

    boot();

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLE,
          filter: `conversation_id=eq.${conversationId}`,
        },
        ({ new: n, old: o }: TypingPayload) => {
          const row = (n || o) as TypingRow | undefined;
          if (!row?.conversation_id || !row?.user_id) return;
          markTyping({
            conversation_id: row.conversation_id,
            user_id: row.user_id,
            is_typing: !!row.is_typing,
            updated_at: row.updated_at ?? null,
          });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);

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
    setTyping, // ✅ ChatInput uses this
  };
}
