import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { pickCvFile, uploadAndAnalyzeCv } from '../../lib/cv';
import { CareerReadinessRing } from '../../components/CareerReadinessRing';
import { colors, radius, shadow, spacing, typography } from '../../constants/theme';

export default function CvScore() {
  const { profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!profile) return;
    setError(null);
    try {
      const file = await pickCvFile();
      if (!file) return; // user canceled
      setBusy(true);
      await uploadAndAnalyzeCv(profile.id, file);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const hasScore = profile?.cv_score != null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.h1}>CV Score</Text>

        {busy ? (
          <View style={styles.busyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.bodyMuted, styles.busyText]}>Analyzing your CV…</Text>
          </View>
        ) : hasScore ? (
          <>
            <View style={styles.ringWrap}>
              <CareerReadinessRing percent={profile!.cv_score!} />
            </View>

            <Section title="Strengths" items={profile?.cv_strengths} empty="None recorded." />
            <Section title="Gaps" items={profile?.cv_gaps} empty="None recorded." />
            <Section title="Missing skills" items={profile?.cv_missing_skills} empty="None recorded." />

            <Pressable style={styles.reuploadButton} onPress={handleUpload}>
              <Text style={styles.reuploadText}>Re-upload CV</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[typography.bodyMuted, styles.emptyText]}>
              Upload your CV as a PDF to get a score, strengths, gaps, and missing skills.
            </Text>
            <Pressable style={styles.uploadButton} onPress={handleUpload}>
              <Text style={styles.uploadButtonText}>Upload CV</Text>
            </Pressable>
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, items, empty }: { title: string; items?: string[] | null; empty: string }) {
  return (
    <View style={styles.section}>
      <Text style={typography.h3}>{title}</Text>
      {items && items.length > 0 ? (
        items.map((item) => (
          <Text key={item} style={[typography.body, styles.bullet]}>
            • {item}
          </Text>
        ))
      ) : (
        <Text style={typography.bodyMuted}>{empty}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  ringWrap: { alignItems: 'center', marginVertical: spacing.lg },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  bullet: { marginTop: spacing.xs },
  emptyState: { marginTop: spacing.xl, alignItems: 'center' },
  emptyText: { textAlign: 'center', marginBottom: spacing.lg },
  busyState: { marginTop: spacing.xxl, alignItems: 'center' },
  busyText: { marginTop: spacing.md },
  uploadButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  uploadButtonText: { ...typography.button },
  reuploadButton: {
    alignSelf: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
  },
  reuploadText: { ...typography.body, fontWeight: '600', color: colors.primary },
  error: { ...typography.body, color: colors.danger, marginTop: spacing.md, textAlign: 'center' },
});
