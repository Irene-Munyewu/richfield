import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';

type Props = {
  name: string;
  proficiency: number;
};

export function SkillProgressBar({ name, proficiency }: Props) {
  const clamped = Math.max(0, Math.min(100, proficiency));
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={typography.body}>{name}</Text>
        <Text style={typography.caption}>{clamped}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
});
