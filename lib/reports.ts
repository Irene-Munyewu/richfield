import { supabase } from './supabase';

export async function reportPost(postId: string, reporterId: string) {
  const { error } = await supabase.from('reports').insert({ post_id: postId, reporter_id: reporterId });
  if (error) throw error;
}

export type OpenReport = {
  id: string;
  post_id: string;
  reason: string | null;
  post_content: string;
  author_id: string;
  author_name: string;
};

export async function fetchOpenReports(): Promise<OpenReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, post_id, reason, post:posts(id, content, author:profiles(id, full_name))')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    post_id: r.post_id,
    reason: r.reason,
    post_content: r.post?.content ?? '',
    author_id: r.post?.author?.id ?? '',
    author_name: r.post?.author?.full_name ?? 'Unknown',
  }));
}

export async function dismissReport(reportId: string) {
  const { error } = await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
  if (error) throw error;
}

/** Deletes the reported post — cascades to its comments, reactions, and all reports against it. */
export async function removeReportedPost(postId: string) {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function suspendReportedAuthor(reportId: string, authorId: string) {
  const { error: suspendError } = await supabase.from('profiles').update({ suspended: true }).eq('id', authorId);
  if (suspendError) throw suspendError;
  const { error: reportError } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
  if (reportError) throw reportError;
}
