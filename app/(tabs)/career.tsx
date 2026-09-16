import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { colors, radius, shadow, spacing, typography } from '../../constants/theme';

const STAGES = [
  {
    key: 'student',
    label: 'Student',
    description: 'Build foundational skills through coursework and personal projects.',
  },
  {
    key: 'internship',
    label: 'Internship',
    description: 'Gain real-world experience and mentorship in a professional team.',
  },
  {
    key: 'junior_dev',
    label: 'Junior Dev',
    description: 'Ship production code, learn from code review, and grow steadily.',
  },
  {
    key: 'dev',
    label: 'Dev',
    description: 'Own features end-to-end and mentor newer developers.',
  },
  {
    key: 'senior_dev',
    label: 'Senior Dev',
    description: 'Lead technical direction and make architectural decisions.',
  },
] as const;

export default function Career() {
  const { profile } = useAuth();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const currentIndex = Math.max(
    0,
    STAGES.findIndex((s) => s.key === (profile?.current_stage ?? 'student'))
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.h1}>Career Pathway</Text>
        <Text style={[typography.bodyMuted, styles.subtitle]}>
          Where you are, and where you're headed.
        </Text>

        <View style={styles.timeline}>
          {STAGES.map((stage, index) => {
            const isCurrent = index === currentIndex;
            const isPast = index < currentIndex;
            const isExpanded = expanded === stage.key;
            const isLast = index === STAGES.length - 1;

            return (
              <View key={stage.key} style={styles.stageRow}>
                <View style={styles.markerCol}>
                  <View style={[styles.dot, isPast && styles.dotPast, isCurrent && styles.dotCurrent]} />
                  {!isLast && <View style={[styles.connector, isPast && styles.connectorPast]} />}
                </View>

                <Pressable
                  style={[styles.stageCard, isCurrent && styles.stageCardCurrent]}
                  onPress={() => setExpanded(isExpanded ? null : stage.key)}
                >
                  <View style={styles.stageHeader}>
                    <View style={styles.stageTitleRow}>
                      <Text style={[typography.h3, isCurrent && styles.currentText]}>{stage.label}</Text>
                      {isCurrent && <Text style={styles.currentBadge}>YOU ARE HERE</Text>}
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </View>
                  {isExpanded && (
                    <Text style={[typography.bodyMuted, styles.stageDesc]}>{stage.description}</Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        <Pressable style={styles.gapButton} onPress={() => router.push('/skills-gap')}>
          <Text style={styles.gapButtonText}>View Skills Gap Analysis</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.textOnPrimary} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  subtitle: { marginTop: 2, marginBottom: spacing.lg },
  timeline: { marginBottom: spacing.lg },
  stageRow: { flexDirection: 'row' },
  markerCol: { alignItems: 'center', width: 24 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.card,
  },
  dotPast: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  dotCurrent: { backgroundColor: colors.primary },
  connector: { flex: 1, width: 2, backgroundColor: colors.border, minHeight: spacing.lg },
  connectorPast: { backgroundColor: colors.primary },
  stageCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginLeft: spacing.sm,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  stageCardCurrent: { borderWidth: 1.5, borderColor: colors.primary },
  stageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  currentText: { color: colors.primary },
  currentBadge: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  stageDesc: { marginTop: spacing.sm },
  gapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  gapButtonText: { ...typography.button },
});
