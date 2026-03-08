// lib/firestore/polls.ts
// Poll creation + voting on top of the `posts` collection (post_type: "poll")
//
// ✅ createPoll()   — writes poll post, extracts + indexes hashtags
// ✅ votePoll()     — transaction-safe: increments option votes + writes vote record
// ✅ getUserVote()  — checks if current user already voted + which options they picked
// ✅ isPollExpired()— utility to check whether a poll has ended

import { auth, db } from "@/lib/firebase";
import { extractHashtags, indexHashtags } from "@/lib/firestore/hashtags";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    increment,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore";

/* =====================================================
   TYPES
===================================================== */

export type PollVisibility = "public" | "followers" | "private";
export type PollDurationDays = 1 | 3 | 7 | 14;

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  allow_multiple: boolean;
  is_anonymous: boolean;
  duration_days: PollDurationDays;
  ends_at: string; // ISO
  total_votes: number;
}

export interface CreatePollInput {
  question: string;
  options: string[]; // plain text options
  allow_multiple: boolean;
  is_anonymous: boolean;
  duration_days: PollDurationDays;
  visibility: PollVisibility;
  community_id?: string;
}

export interface PollVoteRecord {
  user_id: string | null;
  option_ids: string[];
  voted_at: string;
}

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/* =====================================================
   HELPERS
===================================================== */

export function isPollExpired(endsAt: string): boolean {
  return new Date(endsAt).getTime() <= Date.now();
}

export function getPollOptionPercentage(
  option: PollOption,
  totalVotes: number,
): number {
  if (!totalVotes) return 0;
  return Math.round((option.votes / totalVotes) * 100);
}

/* =====================================================
   CREATE POLL
===================================================== */

/**
 * Creates a new poll as a post (post_type: "poll") in Firestore.
 * Returns the new post ID for navigation to /post/[id].
 */
export async function createPoll(input: CreatePollInput): Promise<string> {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const uid = viewer.uid;

  // Build options with IDs + zero vote counts
  const pollOptions: PollOption[] = input.options
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((text) => ({ id: makeId(), text, votes: 0 }));

  if (pollOptions.length < 2) {
    throw new Error("A poll needs at least 2 options.");
  }

  const endsAt = new Date(
    Date.now() + input.duration_days * 24 * 60 * 60 * 1000,
  ).toISOString();

  const poll: PollData = {
    question: input.question.trim(),
    options: pollOptions,
    allow_multiple: input.allow_multiple,
    is_anonymous: input.is_anonymous,
    duration_days: input.duration_days,
    ends_at: endsAt,
    total_votes: 0,
  };

  const now = new Date().toISOString();

  // Extract hashtags from question
  const hashtags = extractHashtags(input.question);

  // Fetch profile snapshot for denormalization
  let userSnap: any = null;
  try {
    const profileDoc = await getDoc(doc(db, "profiles", uid));
    if (profileDoc.exists()) {
      const d = profileDoc.data() as any;
      userSnap = {
        id: uid,
        username: d.username ?? "",
        full_name: d.full_name ?? null,
        avatar_url: d.avatar_url ?? null,
      };
    }
  } catch {
    // non-fatal — feed will show fallback
  }

  // Fetch community snapshot if provided
  let communitySnap: any = null;
  if (input.community_id) {
    try {
      const commDoc = await getDoc(doc(db, "communities", input.community_id));
      if (commDoc.exists()) {
        const d = commDoc.data() as any;
        communitySnap = {
          id: input.community_id,
          name: d.name ?? "",
          slug: d.slug ?? "",
          avatar_url: d.avatar_url ?? d.image_url ?? null,
        };
      }
    } catch {
      // non-fatal
    }
  }

  const ref = await addDoc(collection(db, "posts"), {
    user_id: uid,
    title: input.question.trim(),
    content: input.question.trim(),
    media_urls: [],
    post_type: "poll",
    visibility: input.visibility,
    is_visible: true,
    community_id: input.community_id ?? null,
    hashtags,

    // Standard counters
    like_count: 0,
    comment_count: 0,
    share_count: 0,

    // Poll payload
    poll,

    // Denormalized for feed
    user: userSnap,
    community: communitySnap,

    created_at: now,
    updated_at: now,
    created_at_ts: serverTimestamp(),
    updated_at_ts: serverTimestamp(),
  });

  // Fire-and-forget hashtag indexing
  if (hashtags.length) {
    indexHashtags(hashtags).catch((e) =>
      console.warn("Poll hashtag indexing failed:", e),
    );
  }

  return ref.id;
}

/* =====================================================
   VOTE ON POLL
===================================================== */

/**
 * Cast a vote on a poll. Uses a Firestore transaction so:
 * - Vote counts are updated atomically
 * - Duplicate votes are prevented (the vote doc acts as a guard)
 * - Works for both anonymous and identified votes
 */
export async function votePoll(
  postId: string,
  optionIds: string[],
): Promise<void> {
  const viewer = auth.currentUser;
  if (!viewer) throw new Error("Not authenticated");

  const uid = viewer.uid;
  const postRef = doc(db, "posts", postId);
  const voteRef = doc(db, "posts", postId, "poll_votes", uid);

  await runTransaction(db, async (tx) => {
    const [postSnap, voteSnap] = await Promise.all([
      tx.get(postRef),
      tx.get(voteRef),
    ]);

    if (!postSnap.exists()) throw new Error("Poll not found");
    if (voteSnap.exists()) throw new Error("You have already voted");

    const data = postSnap.data() as any;
    const poll: PollData = data.poll;

    if (!poll) throw new Error("This post is not a poll");
    if (isPollExpired(poll.ends_at)) throw new Error("This poll has ended");

    // Validate option IDs belong to this poll
    const validIds = new Set(poll.options.map((o) => o.id));
    const chosen = optionIds.filter((id) => validIds.has(id));
    if (!chosen.length) throw new Error("No valid options selected");

    // If single-choice, cap at 1
    const finalChosen = poll.allow_multiple ? chosen : [chosen[0]];

    // Update options array with incremented vote counts
    const updatedOptions: PollOption[] = poll.options.map((opt) => ({
      ...opt,
      votes: finalChosen.includes(opt.id) ? opt.votes + 1 : opt.votes,
    }));

    tx.update(postRef, {
      "poll.options": updatedOptions,
      "poll.total_votes": increment(finalChosen.length),
      updated_at: new Date().toISOString(),
    });

    // Write vote record — using uid as doc ID prevents double-voting
    const isAnonymous = poll.is_anonymous;
    tx.set(voteRef, {
      user_id: isAnonymous ? null : uid,
      option_ids: finalChosen,
      voted_at: serverTimestamp(),
    });
  });
}

/* =====================================================
   GET USER VOTE
===================================================== */

/**
 * Returns the option IDs the current user voted for,
 * or null if they haven't voted yet.
 */
export async function getUserVote(postId: string): Promise<string[] | null> {
  const viewer = auth.currentUser;
  if (!viewer) return null;

  const voteRef = doc(db, "posts", postId, "poll_votes", viewer.uid);
  const snap = await getDoc(voteRef);

  if (!snap.exists()) return null;
  return (snap.data() as PollVoteRecord).option_ids ?? null;
}
