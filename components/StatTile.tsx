import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';

type Props = { label: string; value: string | number };

export function StatTile({ label, value }: Props) {
  return (
    <View style={styles.tile}>
      <Text style={styles.value}>{value}</Text>
      <Text style={typography.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  value: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 2 },
});
