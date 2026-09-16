import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import {
  fetchEvents,
  fetchMyRegisteredEventIds,
  registerForEvent,
  unregisterFromEvent,
  type Event,
} from '../../lib/events';
import { useToast } from '../../lib/toast-context';
import { LoadingState } from '../../components/LoadingState';
import { colors, radius, shadow, spacing, typography } from '../../constants/theme';

function formatEventDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Events() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [evts, registered] = await Promise.all([fetchEvents(), fetchMyRegisteredEventIds(profile.id)]);
      setEvents(evts);
      setRegisteredIds(registered);
    } catch (err) {
      console.error('Failed to load events:', err);
      showToast("Couldn't load events — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [profile, showToast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function toggleRegistration(event: Event) {
    if (!profile) return;
    const isRegistered = registeredIds.has(event.id);
    setActionId(event.id);
    try {
      if (isRegistered) {
        await unregisterFromEvent(event.id, profile.id);
        setRegisteredIds((prev) => {
          const next = new Set(prev);
          next.delete(event.id);
          return next;
        });
      } else {
        await registerForEvent(event.id, profile.id);
        setRegisteredIds((prev) => new Set(prev).add(event.id));
        showToast(`Registered for "${event.title}".`);
      }
    } catch (err) {
      console.error('Registration action failed:', err);
      showToast('Something went wrong — please try again.');
    } finally {
      setActionId(null);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.h1}>Events</Text>
        <Text style={[typography.bodyMuted, styles.subtitle]}>Upcoming events from Richfield Connect.</Text>

        {loading ? (
          <LoadingState />
        ) : events.length === 0 ? (
          <Text style={typography.bodyMuted}>No events scheduled yet.</Text>
        ) : (
          events.map((e) => {
            const isRegistered = registeredIds.has(e.id);
            return (
              <View key={e.id} style={styles.card}>
                <Text style={typography.h3}>{e.title}</Text>
                <Text style={typography.bodyMuted}>
                  {formatEventDate(e.event_date)}
                  {e.location ? ` · ${e.location}` : ''}
                </Text>
                {e.description && <Text style={[typography.body, styles.desc]}>{e.description}</Text>}
                <Pressable
                  style={[styles.registerButton, isRegistered && styles.registeredButton]}
                  onPress={() => toggleRegistration(e)}
                  disabled={actionId === e.id}
                >
                  {actionId === e.id ? (
                    <ActivityIndicator size="small" color={isRegistered ? colors.primary : colors.textOnPrimary} />
                  ) : (
                    <Text style={[styles.registerText, isRegistered && styles.registeredText]}>
                      {isRegistered ? 'Registered ✓' : 'Register'}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  subtitle: { marginTop: 2, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  desc: { marginTop: spacing.sm },
  registerButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  registeredButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  registerText: { color: colors.textOnPrimary, fontWeight: '700' },
  registeredText: { color: colors.primary },
});
