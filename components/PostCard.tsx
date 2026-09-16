import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addComment, fetchComments, formatRelativeTime, type FeedComment } from '../lib/feed';
import { reportPost } from '../lib/reports';
import { useToast } from '../lib/toast-context';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';

type Props = {
  authorName: string;
  authorHeadline: string | null;
  createdAt: string;
  content: string;
  reactionCount: number;
  commentCount: number;
  myReaction: boolean;
  onToggleReaction: () => void;
  postId: string;
  myProfileId: string;
  onCommentAdded: () => void;
};

export function PostCard({
  authorName,
  authorHeadline,
  createdAt,
  content,
  reactionCount,
  commentCount,
  myReaction,
  onToggleReaction,
  postId,
  myProfileId,
  onCommentAdded,
}: Props) {
  const { showToast } = useToast();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);

  async function handleReport() {
    if (reported || reporting) return;
    setReporting(true);
    try {
      await reportPost(postId, myProfileId);
      setReported(true);
      showToast('Post reported — an admin will review it.');
    } catch (err: any) {
      // Unique (post_id, reporter_id) violation just means they already reported it.
      if (err?.code === '23505') {
        setReported(true);
        showToast("You've already reported this post.");
      } else {
        console.error('Failed to report post:', err);
        showToast("Couldn't report the post — please try again.");
      }
    } finally {
      setReporting(false);
    }
  }

  async function toggleComments() {
    const opening = !commentsOpen;
    setCommentsOpen(opening);
    if (opening && comments.length === 0) {
      setLoadingComments(true);
      try {
        setComments(await fetchComments(postId));
      } catch (err) {
        console.error('Failed to load comments:', err);
        showToast("Couldn't load comments — check your connection.");
      } finally {
        setLoadingComments(false);
      }
    }
  }

  async function submitComment() {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      await addComment(postId, myProfileId, text);
      setDraft('');
      setComments(await fetchComments(postId));
      onCommentAdded();
    } catch (err) {
      console.error('Failed to post comment:', err);
      showToast("Couldn't post your comment — please try again.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={typography.h3}>{authorName}</Text>
        <Text style={typography.caption}>{formatRelativeTime(createdAt)}</Text>
      </View>
      {authorHeadline && <Text style={typography.bodyMuted}>{authorHeadline}</Text>}
      <Text style={[typography.body, styles.content]}>{content}</Text>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionButton} onPress={onToggleReaction}>
          <Ionicons
            name={myReaction ? 'heart' : 'heart-outline'}
            size={18}
            color={myReaction ? colors.danger : colors.textMuted}
          />
          <Text style={styles.actionText}>{reactionCount}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={toggleComments}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
          <Text style={styles.actionText}>{commentCount}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={handleReport} disabled={reporting}>
          {reporting ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Ionicons name="flag-outline" size={18} color={reported ? colors.danger : colors.textMuted} />
          )}
        </Pressable>
      </View>

      {commentsOpen && (
        <View style={styles.commentsWrap}>
          {loadingComments ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                <Text style={styles.commentAuthor}>{c.author.full_name}</Text>
                <Text style={typography.body}>{c.content}</Text>
              </View>
            ))
          )}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a comment..."
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={submitComment}
            />
            <Pressable onPress={submitComment} disabled={posting}>
              <Ionicons name="send" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  content: { marginTop: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { ...typography.caption, fontWeight: '600' },
  commentsWrap: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  commentRow: { gap: 2 },
  commentAuthor: { ...typography.caption, fontWeight: '700' },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  commentInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
});
