import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../constants/theme';

type Props = {
  title: string;
  note: string;
  onSignOut?: () => void;
};

/** Placeholder for a screen whose real content lands in a later phase. */
export function PlaceholderScreen({ title, note, onSignOut }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={typography.h1}>{title}</Text>
        <Text style={[typography.bodyMuted, styles.note]}>{note}</Text>
        {onSignOut && (
          <Pressable style={styles.signOutButton} onPress={onSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  note: { marginTop: spacing.sm },
  signOutButton: {
    marginTop: spacing.xl,
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
  },
  signOutText: { ...typography.body, fontWeight: '600', color: colors.danger },
});
