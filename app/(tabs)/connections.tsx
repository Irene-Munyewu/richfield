import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { fetchMyConnections, type Connection } from '../../lib/connections';
import { useToast } from '../../lib/toast-context';
import { LoadingState } from '../../components/LoadingState';
import { colors, radius, shadow, spacing, typography } from '../../constants/theme';

export default function Connections() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setConnections(await fetchMyConnections(profile.id));
    } catch (err) {
      console.error('Failed to load connections:', err);
      showToast("Couldn't load connections — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [profile, showToast]);

  // Refetch on focus so a connect made on the Alumni screen shows up here
  // right away.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const connected = connections.filter((c) => c.status === 'connected');
  const pending = connections.filter((c) => c.status === 'pending');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.h1}>Connections</Text>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {connections.length === 0 && (
              <Text style={[typography.bodyMuted, styles.emptyState]}>
                No connections yet — Discover Alumni
              </Text>
            )}

            {pending.length > 0 && (
              <>
                <Text style={[typography.h3, styles.sectionTitle]}>Pending</Text>
                {pending.map((c) => (
                  <ConnectionRow key={c.id} connection={c} />
                ))}
              </>
            )}

            {connected.length > 0 && (
              <>
                <Text style={[typography.h3, styles.sectionTitle]}>Connected</Text>
                {connected.map((c) => (
                  <ConnectionRow key={c.id} connection={c} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ConnectionRow({ connection }: { connection: Connection }) {
  return (
    <View style={styles.row}>
      <Text style={typography.h3}>{connection.otherProfile.full_name}</Text>
      {connection.otherProfile.headline && (
        <Text style={typography.bodyMuted}>{connection.otherProfile.headline}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  emptyState: { marginTop: spacing.xl, textAlign: 'center' },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.sm },
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
});
