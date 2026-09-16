import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { fetchAlumni, type AlumniProfile } from '../../lib/alumni';
import {
  confirmConnection,
  fetchMyConnectionStatuses,
  sendConnectionRequest,
  type ConnectionStatus,
} from '../../lib/connections';
import { useToast } from '../../lib/toast-context';
import { AlumniCard } from '../../components/AlumniCard';
import { LoadingState } from '../../components/LoadingState';
import { colors, spacing, typography } from '../../constants/theme';

export default function Alumni() {
  const { profile } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [statuses, setStatuses] = useState<Map<string, ConnectionStatus>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const [list, statusMap] = await Promise.all([fetchAlumni(), fetchMyConnectionStatuses(profile.id)]);
      setAlumni(list);
      setStatuses(statusMap);
    } catch (err) {
      console.error('Failed to load alumni:', err);
      showToast("Couldn't load alumni — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [profile, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConnect(otherId: string) {
    if (!profile) return;
    const current = statuses.get(otherId) ?? 'none';
    try {
      if (current === 'none') {
        await sendConnectionRequest(profile.id, otherId);
        setStatuses((prev) => new Map(prev).set(otherId, 'pending'));
      } else if (current === 'pending') {
        await confirmConnection(profile.id, otherId);
        setStatuses((prev) => new Map(prev).set(otherId, 'connected'));
      }
    } catch (err) {
      console.error('Connection action failed:', err);
      showToast('Connection action failed — please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.h1}>Alumni</Text>
        <Text style={[typography.bodyMuted, styles.subtitle]}>
          See how people who walked a similar path got there.
        </Text>

        {loading ? (
          <LoadingState />
        ) : alumni.length === 0 ? (
          <Text style={typography.bodyMuted}>No alumni profiles yet.</Text>
        ) : (
          alumni.map((a) => (
            <AlumniCard
              key={a.id}
              name={a.full_name}
              headline={a.headline}
              company={a.company}
              connectionStatus={statuses.get(a.id) ?? 'none'}
              onPress={() => router.push({ pathname: '/alumni-journey', params: { id: a.id, name: a.full_name } })}
              onConnectPress={() => handleConnect(a.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  subtitle: { marginTop: 2, marginBottom: spacing.lg },
});
