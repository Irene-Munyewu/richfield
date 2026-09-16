import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { fetchNotifications, markNotificationRead, type Notification } from '../../lib/notifications';
import { formatRelativeTime } from '../../lib/feed';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../lib/toast-context';
import { LoadingState } from '../../components/LoadingState';
import { colors, radius, shadow, spacing, typography } from '../../constants/theme';

export default function Notifications() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setItems(await fetchNotifications(profile.id));
    } catch (err) {
      console.error('Failed to load notifications:', err);
      showToast("Couldn't load notifications — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [profile, showToast]);

  // Refetch every time this screen gains focus — this is how the "new
  // notification appears after switching back to Student" moment works,
  // with no realtime/websocket infra involved.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Realtime on top of the focus refetch — updates the list live if a new
  // notification arrives while this screen is already open.
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`notifications-list-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profile.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, load]);

  async function handlePress(n: Notification) {
    if (n.is_read) return;
    setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, is_read: true } : it)));
    try {
      await markNotificationRead(n.id);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.h1}>Notifications</Text>

        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <Text style={[typography.bodyMuted, styles.emptyState]}>No notifications yet.</Text>
        ) : (
          items.map((n) => (
            <Pressable key={n.id} style={[styles.card, !n.is_read && styles.unreadCard]} onPress={() => handlePress(n)}>
              {!n.is_read && <View style={styles.unreadDot} />}
              <View style={styles.textCol}>
                <Text style={typography.h3}>{n.title}</Text>
                {n.body && <Text style={typography.bodyMuted}>{n.body}</Text>}
                <Text style={styles.time}>{formatRelativeTime(n.created_at)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  emptyState: { marginTop: spacing.xl, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.card,
  },
  unreadCard: { borderWidth: 1, borderColor: colors.primaryLight },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  textCol: { flex: 1 },
  time: { ...typography.caption, marginTop: spacing.xs },
});
