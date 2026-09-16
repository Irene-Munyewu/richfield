import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { setProfileVisibility } from '../../lib/profile';
import { useToast } from '../../lib/toast-context';
import { colors, radius, shadow, spacing, typography } from '../../constants/theme';

export default function Profile() {
  const { profile, refreshProfile, signOut } = useAuth();
  const { showToast } = useToast();
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  async function handleToggleVisibility(value: boolean) {
    if (!profile) return;
    setTogglingVisibility(true);
    try {
      await setProfileVisibility(profile.id, value);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to update visibility:', err);
      showToast("Couldn't update visibility — please try again.");
    } finally {
      setTogglingVisibility(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={typography.h1}>{profile?.full_name || 'Your profile'}</Text>

        <View style={styles.card}>
          <Row label="Role" value={profile?.role ?? '—'} />
          <Row label="Email" value={profile?.email ?? '—'} />
          {profile?.headline ? <Row label="Headline" value={profile.headline} /> : null}
          {profile?.company ? <Row label="Company" value={profile.company} /> : null}
        </View>

        {profile?.role === 'alumni' && (
          <View style={styles.card}>
            <View style={styles.visibilityRow}>
              <View style={styles.visibilityTextCol}>
                <Text style={typography.h3}>Visible in alumni network</Text>
                <Text style={typography.bodyMuted}>
                  Turn off to hide your profile from the alumni network listing.
                </Text>
              </View>
              <Switch
                value={profile?.is_public ?? true}
                onValueChange={handleToggleVisibility}
                disabled={togglingVisibility}
                trackColor={{ true: colors.primary, false: colors.border }}
              />
            </View>
          </View>
        )}

        <Pressable style={styles.signOutButton} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={typography.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg },
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.card,
  },
  row: { gap: 2 },
  visibilityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  visibilityTextCol: { flex: 1, gap: 2 },
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
