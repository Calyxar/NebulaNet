// lib/firestore/mentions.ts — NEW
// Mirrors the structure of lib/firestore/hashtags.ts: a pure extraction
// function plus a resolution step. Mentions need one extra step hashtags
// don't — resolving the extracted @handles to real user IDs, since a
// mention should notify an actual person, not just be decorative styled
// text. A handle that doesn't match any real user is silently dropped
// (not styled as a mention, no notification) rather than left half-wired.

import { db } from "@/lib/firebase";

export type ResolvedMention = {
  username: string;
  userId: string;
};

/**
 * Pulls raw @handles out of text. Deliberately permissive at this stage —
 * resolution against real users happens separately in resolveMentions(),
 * so a stray "@" with no matching account just resolves to nothing later
 * rather than needing two different regexes to stay in sync.
 */
export function extractMentionHandles(text: string): string[] {
  const matches = text.match(/@[a-zA-Z0-9_]+/g) ?? [];
  return [
    ...new Set(matches.map((m) => m.toLowerCase().replace(/^@/, ""))),
  ].filter(Boolean);
}

/**
 * Resolves extracted handles to real user IDs, batched in groups of 10
 * (Firestore "in" query limit). Handles with no matching account are
 * simply absent from the result — never throws, never partially-resolves.
 */
export async function resolveMentions(
  handles: string[],
): Promise<ResolvedMention[]> {
  if (!handles.length) return [];
  const unique = [...new Set(handles.map((h) => h.toLowerCase()))];
  const resolved: ResolvedMention[] = [];

  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    try {
      const snap = await db
        .collection("profiles")
        .where("username_lc", "in", chunk)
        .get();
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        if (data.username) {
          resolved.push({ username: data.username, userId: d.id });
        }
      });
    } catch (err) {
      console.warn("[resolveMentions] failed to resolve batch:", err);
    }
  }

  return resolved;
}

/**
 * Convenience wrapper: extract + resolve in one call, for the common
 * case of "this post/comment's text just got created, find out who
 * actually got mentioned in it."
 */
export async function extractAndResolveMentions(
  text: string,
): Promise<ResolvedMention[]> {
  const handles = extractMentionHandles(text);
  if (!handles.length) return [];
  return resolveMentions(handles);
}

/**
 * Live autocomplete search — used by the @-mention dropdown while
 * someone is typing. Matches on username_lc prefix, same pattern as
 * resolveUserIdFromUsername elsewhere in the codebase. Capped small
 * (8 results) since this renders in a compact dropdown, not a full list.
 */
export async function searchUsersForMention(
  query: string,
): Promise<{ id: string; username: string; full_name: string | null; avatar_url: string | null }[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  try {
    const snap = await db
      .collection("profiles")
      .where("username_lc", ">=", q)
      .where("username_lc", "<=", q + "\uf8ff")
      .limit(8)
      .get();
    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        username: data.username ?? "",
        full_name: data.full_name ?? null,
        avatar_url: data.avatar_url ?? null,
      };
    });
  } catch (err) {
    console.warn("[searchUsersForMention] search failed:", err);
    return [];
  }
}
