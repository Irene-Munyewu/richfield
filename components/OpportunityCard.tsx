import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';

type Props = {
  title: string;
  company: string;
  type: string;
  location: string | null;
  requiredSkills: string[];
  heldSkills: Set<string>;
  matchPercent: number;
  applied: boolean;
  applying: boolean;
  onApply: () => void;
};

function matchColor(percent: number) {
  if (percent >= 70) return colors.success;
  if (percent >= 40) return colors.warning;
  return colors.textMuted;
}

export function OpportunityCard({
  title,
  company,
  type,
  location,
  requiredSkills,
  heldSkills,
  matchPercent,
  applied,
  applying,
  onApply,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable style={styles.card} onPress={() => setExpanded((e) => !e)}>
      <View style={styles.header}>
        <View style={styles.titleCol}>
          <Text style={typography.h3}>{title}</Text>
          <Text style={typography.bodyMuted}>
            {company}
            {location ? ` · ${location}` : ''}
          </Text>
        </View>
        <View style={[styles.matchBadge, { backgroundColor: matchColor(matchPercent) }]}>
          <Text style={styles.matchText}>{matchPercent}% Match</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.typeTag}>{type.replace('_', ' ')}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </View>

      {expanded && (
        <View style={styles.skillsWrap}>
          {requiredSkills.map((skill) => {
            const has = heldSkills.has(skill);
            return (
              <View key={skill} style={[styles.skillPill, has ? styles.skillPillMatched : styles.skillPillMissing]}>
                <Ionicons
                  name={has ? 'checkmark-circle' : 'close-circle-outline'}
                  size={14}
                  color={has ? colors.success : colors.textMuted}
                />
                <Text style={[styles.skillText, !has && styles.skillTextMissing]}>{skill}</Text>
              </View>
            );
          })}
        </View>
      )}

      <Pressable
        style={[styles.applyButton, applied && styles.appliedButton]}
        onPress={(e) => {
          e.stopPropagation();
          if (!applied) onApply();
        }}
        disabled={applied || applying}
      >
        {applying ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} />
        ) : (
          <Text style={[styles.applyText, applied && styles.appliedText]}>
            {applied ? 'Applied ✓' : 'Apply'}
          </Text>
        )}
      </Pressable>
    </Pressable>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  titleCol: { flex: 1 },
  matchBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  matchText: { color: colors.textOnPrimary, fontSize: 12, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  typeTag: { ...typography.caption, textTransform: 'capitalize' },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
  },
  skillPillMatched: { backgroundColor: colors.primaryLight, borderColor: colors.primaryLight },
  skillPillMissing: { backgroundColor: colors.background, borderColor: colors.border },
  skillText: { fontSize: 12, fontWeight: '600', color: colors.text },
  skillTextMissing: { color: colors.textMuted },
  applyButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  appliedButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  applyText: { color: colors.textOnPrimary, fontWeight: '700' },
  appliedText: { color: colors.primary },
});
