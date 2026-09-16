import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';

type Props = {
  name: string;
  whyItMatters: string | null;
  recommendedAction: string | null;
};

export function GapSkillCard({ name, whyItMatters, recommendedAction }: Props) {
  return (
    <View style={styles.card}>
      <Text style={typography.h3}>{name}</Text>
      {whyItMatters && <Text style={[typography.bodyMuted, styles.why]}>{whyItMatters}</Text>}
      {recommendedAction && (
        <View style={styles.actionBox}>
          <Text style={styles.actionLabel}>RECOMMENDED</Text>
          <Text style={typography.body}>{recommendedAction}</Text>
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
  why: { marginTop: spacing.xs },
  actionBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  actionLabel: { ...typography.caption, color: colors.primary, marginBottom: 2, fontWeight: '700' },
});
