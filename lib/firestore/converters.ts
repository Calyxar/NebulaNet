// lib/firestore/converters.ts — FIRESTORE ✅
// Typed converters for all Firestore collections
// Usage: collection(db, "communities").withConverter(communityConverter)

import {
    DocumentData,
    FirestoreDataConverter,
    QueryDocumentSnapshot,
    serverTimestamp,
    SnapshotOptions,
    Timestamp,
} from "firebase/firestore";

/* =========================================================
   HELPERS
========================================================= */

function tsToIso(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/* =========================================================
   COMMUNITY
========================================================= */

export type CommunityDoc = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
  slug: string;
  owner_id: string | null;
};

export const communityConverter: FirestoreDataConverter<CommunityDoc> = {
  toFirestore(community: CommunityDoc): DocumentData {
    return {
      name: community.name,
      description: community.description ?? null,
      image_url: community.image_url ?? null,
      member_count: community.member_count ?? 0,
      slug: community.slug,
      owner_id: community.owner_id ?? null,
      created_at: community.created_at
        ? Timestamp.fromDate(new Date(community.created_at))
        : serverTimestamp(),
      updated_at: serverTimestamp(),
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): CommunityDoc {
    const d = snapshot.data(options);
    return {
      id: snapshot.id,
      name: d.name ?? "",
      description: d.description ?? null,
      image_url: d.image_url ?? null,
      member_count: d.member_count ?? 0,
      created_at: tsToIso(d.created_at),
      updated_at: tsToIso(d.updated_at),
      slug: d.slug ?? "",
      owner_id: d.owner_id ?? null,
    };
  },
};

/* =========================================================
   COMMUNITY MEMBER
========================================================= */

export type CommunityMemberDoc = {
  id: string;
  user_id: string;
  community_id: string;
  role: string | null;
  created_at: string;
};

export const communityMemberConverter: FirestoreDataConverter<CommunityMemberDoc> =
  {
    toFirestore(member: CommunityMemberDoc): DocumentData {
      return {
        user_id: member.user_id,
        community_id: member.community_id,
        role: member.role ?? "member",
        created_at: member.created_at
          ? Timestamp.fromDate(new Date(member.created_at))
          : serverTimestamp(),
      };
    },

    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions,
    ): CommunityMemberDoc {
      const d = snapshot.data(options);
      return {
        id: snapshot.id,
        user_id: d.user_id ?? "",
        community_id: d.community_id ?? "",
        role: d.role ?? null,
        created_at: tsToIso(d.created_at),
      };
    },
  };

/* =========================================================
   PROFILE
========================================================= */

export type ProfileDoc = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export const profileConverter: FirestoreDataConverter<ProfileDoc> = {
  toFirestore(profile: ProfileDoc): DocumentData {
    return {
      username: profile.username ?? null,
      full_name: profile.full_name ?? null,
      avatar_url: profile.avatar_url ?? null,
      bio: profile.bio ?? null,
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): ProfileDoc {
    const d = snapshot.data(options);
    return {
      id: snapshot.id,
      username: d.username ?? null,
      full_name: d.full_name ?? null,
      avatar_url: d.avatar_url ?? null,
      bio: d.bio ?? null,
    };
  },
};

/* =========================================================
   STORY
========================================================= */

export type StoryDoc = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  created_at: string;
  expires_at: string;
};

export const storyConverter: FirestoreDataConverter<StoryDoc> = {
  toFirestore(story: StoryDoc): DocumentData {
    return {
      user_id: story.user_id,
      media_url: story.media_url,
      media_type: story.media_type,
      caption: story.caption ?? null,
      created_at_ts: story.created_at
        ? Timestamp.fromDate(new Date(story.created_at))
        : serverTimestamp(),
      expires_at_ts: story.expires_at
        ? Timestamp.fromDate(new Date(story.expires_at))
        : null,
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): StoryDoc {
    const d = snapshot.data(options);
    return {
      id: snapshot.id,
      user_id: d.user_id ?? "",
      media_url: d.media_url ?? "",
      media_type: d.media_type ?? "image",
      caption: d.caption ?? null,
      created_at: tsToIso(d.created_at_ts),
      expires_at: tsToIso(d.expires_at_ts),
    };
  },
};

/* =========================================================
   MESSAGE
========================================================= */

export type MessageDoc = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
};

export const messageConverter: FirestoreDataConverter<MessageDoc> = {
  toFirestore(msg: MessageDoc): DocumentData {
    return {
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      content: msg.content ?? null,
      media_url: msg.media_url ?? null,
      media_type: msg.media_type ?? null,
      created_at: serverTimestamp(),
      delivered_at: msg.delivered_at ?? null,
      read_at: msg.read_at ?? null,
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): MessageDoc {
    const d = snapshot.data(options);
    return {
      id: snapshot.id,
      conversation_id: d.conversation_id ?? "",
      sender_id: d.sender_id ?? "",
      content: d.content ?? null,
      media_url: d.media_url ?? null,
      media_type: d.media_type ?? null,
      created_at: tsToIso(d.created_at),
      delivered_at: d.delivered_at ? tsToIso(d.delivered_at) : null,
      read_at: d.read_at ? tsToIso(d.read_at) : null,
    };
  },
};

/* =========================================================
   SUPPORT REPORT
========================================================= */

export type SupportReportDoc = {
  id: string;
  user_id: string;
  subject: string;
  details: string;
  screenshot_bucket: string | null;
  screenshot_path: string | null;
  app_version: string | null;
  platform: string | null;
  device_name: string | null;
  os_version: string | null;
  status: "open" | "resolved";
  created_at: string;
};

export const supportReportConverter: FirestoreDataConverter<SupportReportDoc> =
  {
    toFirestore(report: SupportReportDoc): DocumentData {
      return {
        user_id: report.user_id,
        subject: report.subject,
        details: report.details,
        screenshot_bucket: report.screenshot_bucket ?? null,
        screenshot_path: report.screenshot_path ?? null,
        app_version: report.app_version ?? null,
        platform: report.platform ?? null,
        device_name: report.device_name ?? null,
        os_version: report.os_version ?? null,
        status: report.status ?? "open",
        created_at: serverTimestamp(),
      };
    },

    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions,
    ): SupportReportDoc {
      const d = snapshot.data(options);
      return {
        id: snapshot.id,
        user_id: d.user_id ?? "",
        subject: d.subject ?? "",
        details: d.details ?? "",
        screenshot_bucket: d.screenshot_bucket ?? null,
        screenshot_path: d.screenshot_path ?? null,
        app_version: d.app_version ?? null,
        platform: d.platform ?? null,
        device_name: d.device_name ?? null,
        os_version: d.os_version ?? null,
        status: d.status ?? "open",
        created_at: tsToIso(d.created_at),
      };
    },
  };
