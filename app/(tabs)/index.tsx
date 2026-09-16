import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { fetchProfileSkills, type ProfileSkillRow } from '../../lib/skills';
import { countUnread } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../lib/toast-context';
import { CareerReadinessRing } from '../../components/CareerReadinessRing';
import { NextBestActionCard } from '../../components/NextBestActionCard';
import { ShortcutCard } from '../../components/ShortcutCard';
import { LoadingState } from '../../components/LoadingState';
import { colors, spacing, typography } from '../../constants/theme';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const { profile } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [gaps, setGaps] = useState<ProfileSkillRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const [rows, unreadCount] = await Promise.all([
        fetchProfileSkills(profile.id),
        countUnread(profile.id),
      ]);
      setGaps(rows.filter((r) => r.is_gap));
      setUnread(unreadCount);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      showToast("Couldn't refresh your dashboard — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [profile, showToast]);

  // Refetch on every focus (not just mount) so the unread badge and next
  // best action stay current when switching back from another tab/role.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Realtime on top of the focus refetch — the fallback above still catches
  // it on switch-back, but this updates the badge live while sitting on Home.
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`notifications-badge-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profile.id}` },
        () => {
          countUnread(profile.id)
            .then(setUnread)
            .catch((err) => console.error('Failed to refresh unread count:', err));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const topGap = gaps[0];
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={typography.bodyMuted}>{greeting()},</Text>
            <Text style={typography.h1}>{firstName}</Text>
          </View>
          <Pressable style={styles.bellButton} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <View style={styles.ringWrap}>
              <CareerReadinessRing percent={profile?.career_readiness_pct ?? 0} />
            </View>

            {profile?.career_goal ? (
              <Text style={[typography.bodyMuted, styles.goal]}>
                Goal: <Text style={typography.body}>{profile.career_goal}</Text>
              </Text>
            ) : null}

            {topGap ? (
              <NextBestActionCard
                actionText={topGap.recommended_action ?? `Work on ${topGap.skill.name}`}
                onPress={() => router.push('/skills-gap')}
              />
            ) : null}

            <ShortcutCard
              icon="chatbubble-ellipses-outline"
              title="AI Career Coach"
              subtitle="Ask a question, get a personalized answer"
              onPress={() => router.push('/coach')}
            />
            <ShortcutCard
              icon="document-text-outline"
              title="CV Score"
              subtitle={profile?.cv_score != null ? `Scored ${profile.cv_score}/100` : 'Upload your CV for analysis'}
              onPress={() => router.push('/cv-score')}
            />
            <ShortcutCard
              icon="calendar-outline"
              title="Events"
              subtitle="See upcoming events and register"
              onPress={() => router.push('/events')}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bellButton: { padding: spacing.xs },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.textOnPrimary, fontSize: 10, fontWeight: '700' },
  ringWrap: { alignItems: 'center', marginVertical: spacing.xl },
  goal: { marginBottom: spacing.lg },
});
