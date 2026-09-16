import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { fetchProfileSkills, type ProfileSkillRow } from '../../lib/skills';
import { useToast } from '../../lib/toast-context';
import { SkillProgressBar } from '../../components/SkillProgressBar';
import { GapSkillCard } from '../../components/GapSkillCard';
import { LoadingState } from '../../components/LoadingState';
import { colors, spacing, typography } from '../../constants/theme';

export default function SkillsGap() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [rows, setRows] = useState<ProfileSkillRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetchProfileSkills(profile.id)
      .then(setRows)
      .catch((err) => {
        console.error('Failed to load skills:', err);
        showToast("Couldn't load your skills — check your connection.");
      })
      .finally(() => setLoading(false));
  }, [profile, showToast]);

  const current = rows.filter((r) => !r.is_gap);
  const gaps = rows.filter((r) => r.is_gap);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.h1}>Skills Gap Analysis</Text>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <Text style={[typography.h3, styles.sectionTitle]}>Current skills</Text>
            {current.length === 0 ? (
              <Text style={typography.bodyMuted}>No current skills recorded yet.</Text>
            ) : (
              current.map((r) => <SkillProgressBar key={r.id} name={r.skill.name} proficiency={r.proficiency} />)
            )}

            <Text style={[typography.h3, styles.sectionTitle]}>Skill gaps</Text>
            {gaps.length === 0 ? (
              <Text style={typography.bodyMuted}>No gaps recorded — you're all caught up.</Text>
            ) : (
              gaps.map((r) => (
                <GapSkillCard
                  key={r.id}
                  name={r.skill.name}
                  whyItMatters={r.why_it_matters}
                  recommendedAction={r.recommended_action}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.md },
});
