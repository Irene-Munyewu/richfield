import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';

type Props = {
  actionText: string;
  onPress: () => void;
};

export function NextBestActionCard({ actionText, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.textCol}>
        <Text style={styles.label}>NEXT BEST ACTION</Text>
        <Text style={[typography.h3, styles.title]}>{actionText}</Text>
      </View>
      <Ionicons name="arrow-forward-circle" size={28} color={colors.textOnPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadow.card,
  },
  textCol: { flex: 1 },
  label: { color: colors.primaryLight, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  title: { color: colors.textOnPrimary, marginTop: 4 },
});
