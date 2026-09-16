import { supabase } from './supabase';

export type FeedPost = {
  id: string;
  content: string;
  created_at: string;
  author: { id: string; full_name: string; headline: string | null; role: string };
  reactionCount: number;
  commentCount: number;
  myReaction: boolean;
};

export async function fetchFeed(myProfileId: string): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      'id, content, created_at, author:profiles(id, full_name, headline, role), reactions(profile_id), comments(id)'
    )
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((p) => {
    const reactions = (p.reactions ?? []) as { profile_id: string }[];
    const comments = (p.comments ?? []) as { id: string }[];
    return {
      id: p.id,
      content: p.content,
      created_at: p.created_at,
      author: p.author as unknown as FeedPost['author'],
      reactionCount: reactions.length,
      commentCount: comments.length,
      myReaction: reactions.some((r) => r.profile_id === myProfileId),
    };
  });
}

export async function createPost(authorId: string, content: string) {
  const { error } = await supabase.from('posts').insert({ author_id: authorId, content });
  if (error) throw error;
}

export async function toggleReaction(postId: string, profileId: string, currentlyLiked: boolean) {
  if (currentlyLiked) {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('post_id', postId)
      .eq('profile_id', profileId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('reactions').insert({ post_id: postId, profile_id: profileId, type: 'like' });
    if (error) throw error;
  }
}

export type FeedComment = {
  id: string;
  content: string;
  created_at: string;
  author: { full_name: string };
};

export async function fetchComments(postId: string): Promise<FeedComment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('id, content, created_at, author:profiles(full_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as FeedComment[];
}

export async function addComment(postId: string, authorId: string, content: string) {
  const { error } = await supabase.from('comments').insert({ post_id: postId, author_id: authorId, content });
  if (error) throw error;
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
