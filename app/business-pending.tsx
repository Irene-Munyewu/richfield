import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth-context';
import { colors, radius, spacing, typography } from '../constants/theme';

export default function BusinessPendingScreen() {
  const { profile, signOut } = useAuth();
  const rejected = profile?.business_status === 'rejected';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconBadge, rejected && styles.iconBadgeRejected]}>
          <Ionicons
            name={rejected ? 'close-circle' : 'time'}
            size={32}
            color={colors.textOnPrimary}
          />
        </View>
        <Text style={typography.h1}>
          {rejected ? 'Registration not approved' : 'Awaiting approval'}
        </Text>
        <Text style={[typography.bodyMuted, styles.body]}>
          {rejected
            ? 'Your business registration was not approved. If you think this is a mistake, contact Richfield Connect support.'
            : "Thanks for registering. An admin needs to review your business account before you can access the recruiter dashboard. This usually doesn't take long — check back soon."}
        </Text>
        <Pressable style={styles.signOutButton} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconBadgeRejected: { backgroundColor: colors.danger },
  body: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  signOutButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
  },
  signOutText: { ...typography.body, fontWeight: '600', color: colors.danger },
});
