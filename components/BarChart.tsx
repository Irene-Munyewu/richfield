import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/theme';

type Props = {
  data: { label: string; count: number }[];
  color?: string;
  emptyText?: string;
};

export function BarChart({ data, color = colors.primary, emptyText = 'No data yet.' }: Props) {
  if (data.length === 0) {
    return <Text style={typography.bodyMuted}>{emptyText}</Text>;
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={styles.wrap}>
      {data.map((d) => (
        <View key={d.label} style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>
            {d.label}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(d.count / max) * 100}%`, backgroundColor: color }]} />
          </View>
          <Text style={styles.value}>{d.count}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.caption, width: 90 },
  track: {
    flex: 1,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  value: { ...typography.caption, fontWeight: '700', width: 28, textAlign: 'right' },
});
