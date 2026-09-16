import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { fetchProfileSkills } from '../../lib/skills';
import { computeMatchPercent, fetchOpportunities, type Opportunity } from '../../lib/opportunities';
import { applyToOpportunity, fetchMyApplicationIds } from '../../lib/applications';
import { notifyBusinessOfApplication } from '../../lib/notifications';
import { useToast } from '../../lib/toast-context';
import { OpportunityCard } from '../../components/OpportunityCard';
import { LoadingState } from '../../components/LoadingState';
import { colors, spacing, typography } from '../../constants/theme';

export default function Jobs() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [heldSkills, setHeldSkills] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [skillRows, opps, applied] = await Promise.all([
        fetchProfileSkills(profile.id),
        fetchOpportunities(),
        fetchMyApplicationIds(profile.id),
      ]);
      setHeldSkills(new Set(skillRows.filter((r) => !r.is_gap).map((r) => r.skill.name)));
      setOpportunities(opps);
      setAppliedIds(applied);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      showToast("Couldn't load jobs — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [profile, showToast]);

  // Refetch on focus, not just mount — this is how a newly-approved
  // opportunity shows up when switching back to Student mid-demo.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const ranked = [...opportunities]
    .map((o) => ({ ...o, matchPercent: computeMatchPercent(o.required_skills, heldSkills) }))
    .sort((a, b) => b.matchPercent - a.matchPercent);

  async function handleApply(o: Opportunity & { matchPercent: number }) {
    if (!profile) return;
    setApplyingId(o.id);
    try {
      await applyToOpportunity(o.id, profile.id);
      setAppliedIds((prev) => new Set(prev).add(o.id));
      try {
        await notifyBusinessOfApplication(o.business_id, profile.full_name, o.title, o.matchPercent);
      } catch (notifyErr) {
        console.error('Failed to notify business of application:', notifyErr);
      }
      showToast(`Applied to "${o.title}".`);
    } catch (err) {
      console.error('Apply failed:', err);
      showToast("Couldn't apply — please try again.");
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.h1}>Jobs</Text>
        <Text style={[typography.bodyMuted, styles.subtitle]}>
          Ranked by how well your current skills match each opening.
        </Text>

        {loading ? (
          <LoadingState />
        ) : ranked.length === 0 ? (
          <Text style={typography.bodyMuted}>No opportunities posted yet.</Text>
        ) : (
          ranked.map((o) => (
            <OpportunityCard
              key={o.id}
              title={o.title}
              company={o.company}
              type={o.type}
              location={o.location}
              requiredSkills={o.required_skills}
              heldSkills={heldSkills}
              matchPercent={o.matchPercent}
              applied={appliedIds.has(o.id)}
              applying={applyingId === o.id}
              onApply={() => handleApply(o)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  subtitle: { marginTop: 2, marginBottom: spacing.lg },
});
