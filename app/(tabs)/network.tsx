import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { createPost, fetchFeed, toggleReaction, type FeedPost } from '../../lib/feed';
import { useToast } from '../../lib/toast-context';
import { PostCard } from '../../components/PostCard';
import { LoadingState } from '../../components/LoadingState';
import { colors, radius, shadow, spacing, typography } from '../../constants/theme';

export default function Network() {
  const { profile } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setPosts(await fetchFeed(profile.id));
    } catch (err) {
      console.error('Failed to load feed:', err);
      showToast("Couldn't load the feed — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [profile, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePost() {
    const text = draft.trim();
    if (!text || !profile || posting) return;
    setPosting(true);
    try {
      await createPost(profile.id, text);
      setDraft('');
      await load();
    } catch (err) {
      console.error('Failed to create post:', err);
      showToast("Couldn't post — please try again.");
    } finally {
      setPosting(false);
    }
  }

  async function handleToggleReaction(post: FeedPost) {
    if (!profile) return;
    // Optimistic update — feels instant, matches the demo pace.
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, myReaction: !p.myReaction, reactionCount: p.reactionCount + (p.myReaction ? -1 : 1) }
          : p
      )
    );
    try {
      await toggleReaction(post.id, profile.id, post.myReaction);
    } catch (err) {
      console.error('Reaction failed:', err);
      showToast('Reaction failed — please try again.');
      load(); // revert to server truth on failure
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={typography.h1}>Network</Text>
        <View style={styles.shortcutsRow}>
          <Pressable style={styles.shortcut} onPress={() => router.push('/alumni')}>
            <Ionicons name="school-outline" size={16} color={colors.primary} />
            <Text style={styles.shortcutText}>Alumni</Text>
          </Pressable>
          <Pressable style={styles.shortcut} onPress={() => router.push('/connections')}>
            <Ionicons name="people-outline" size={16} color={colors.primary} />
            <Text style={styles.shortcutText}>Connections</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.composer}>
              <TextInput
                style={styles.composerInput}
                value={draft}
                onChangeText={setDraft}
                placeholder="Share something with the network..."
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <Pressable
                style={[styles.postButton, (!draft.trim() || posting) && styles.postButtonDisabled]}
                onPress={handlePost}
                disabled={!draft.trim() || posting}
              >
                {posting ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </Pressable>
            </View>
          }
          ListEmptyComponent={<Text style={typography.bodyMuted}>No posts yet.</Text>}
          renderItem={({ item }) => (
            <PostCard
              postId={item.id}
              authorName={item.author.full_name}
              authorHeadline={item.author.headline}
              createdAt={item.created_at}
              content={item.content}
              reactionCount={item.reactionCount}
              commentCount={item.commentCount}
              myReaction={item.myReaction}
              onToggleReaction={() => handleToggleReaction(item)}
              myProfileId={profile?.id ?? ''}
              onCommentAdded={load}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  shortcutsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  shortcutText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  composer: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  composerInput: {
    minHeight: 60,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.text,
  },
  postButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  postButtonDisabled: { opacity: 0.5 },
  postButtonText: { color: colors.textOnPrimary, fontWeight: '700' },
});
