import { supabase } from "@/lib/supabase";

interface SupabaseComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id?: string | null;
  created_at: string;
  updated_at: string;

  author: {
    id: string;
    username: string;
    full_name?: string | null;
    avatar_url?: string | null;
  }[];
}

export interface Comment extends Omit<SupabaseComment, "author"> {
  author: SupabaseComment["author"][0] | null;
  user_has_liked?: boolean;
  replies?: Comment[];
}

function normalizeComment(
  comment: SupabaseComment,
  extras?: Partial<Comment>,
): Comment {
  return {
    ...comment,
    author: comment.author?.[0] ?? null,
    ...extras,
  };
}

export async function getComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      id,
      post_id,
      author_id,
      content,
      parent_comment_id,
      created_at,
      updated_at,
      author:profiles!comments_author_id_fkey(id, username, full_name, avatar_url)
    `,
    )
    .eq("post_id", postId)
    .is("parent_comment_id", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as SupabaseComment[]).map((c) => normalizeComment(c));
}
