import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { fetchAlumniJourney, type AlumniJourneyStage } from '../../lib/alumni';
import { useToast } from '../../lib/toast-context';
import { LoadingState } from '../../components/LoadingState';
import { colors, radius, shadow, spacing, typography } from '../../constants/theme';

export default function AlumniJourney() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { showToast } = useToast();
  const [stages, setStages] = useState<AlumniJourneyStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchAlumniJourney(id)
      .then(setStages)
      .catch((err) => {
        console.error('Failed to load journey:', err);
        showToast("Couldn't load their career journey — check your connection.");
      })
      .finally(() => setLoading(false));
  }, [id, showToast]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.h1}>{name ?? 'Career Journey'}</Text>
        <Text style={[typography.bodyMuted, styles.subtitle]}>Their path so far.</Text>

        {loading ? (
          <LoadingState />
        ) : stages.length === 0 ? (
          <Text style={typography.bodyMuted}>No journey recorded yet.</Text>
        ) : (
          stages.map((stage, index) => (
            <View key={stage.id} style={styles.stageRow}>
              <View style={styles.markerCol}>
                <View style={styles.dot} />
                {index < stages.length - 1 && <View style={styles.connector} />}
              </View>
              <View style={styles.stageCard}>
                {stage.year && <Text style={styles.year}>{stage.year}</Text>}
                <Text style={typography.h3}>{stage.stage_title}</Text>
                {stage.stage_subtitle && <Text style={typography.bodyMuted}>{stage.stage_subtitle}</Text>}
                {stage.description && <Text style={[typography.body, styles.desc]}>{stage.description}</Text>}
              </View>
            </View>
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
  stageRow: { flexDirection: 'row' },
  markerCol: { alignItems: 'center', width: 24 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.card,
  },
  connector: { flex: 1, width: 2, backgroundColor: colors.border, minHeight: spacing.lg },
  stageCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginLeft: spacing.sm,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  year: { ...typography.caption, color: colors.primary, fontWeight: '700', marginBottom: 2 },
  desc: { marginTop: spacing.xs },
});
