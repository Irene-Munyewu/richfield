import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { useAuth } from '../lib/auth-context';
import {
  createOpportunity,
  fetchBusinessOpportunities,
  fetchCandidateMatches,
  type CandidateMatch,
  type Opportunity,
} from '../lib/opportunities';
import { fetchAllSkills, type Skill } from '../lib/skills';
import { useToast } from '../lib/toast-context';
import { colors, radius, shadow, spacing, typography } from '../constants/theme';

const OPPORTUNITY_TYPES: { value: string; label: string }[] = [
  { value: 'internship', label: 'Internship' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'graduate', label: 'Graduate' },
];

export default function BusinessDashboard() {
  const { profile, signOut } = useAuth();
  const { showToast } = useToast();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [candidates, setCandidates] = useState<CandidateMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const [showComposer, setShowComposer] = useState(false);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('internship');
  const [closingDate, setClosingDate] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const opps = await fetchBusinessOpportunities(profile.id);
      // Feature the pending listing (the one awaiting approval) if there is
      // one, otherwise fall back to the most recent posting.
      const featured = opps.find((o) => o.status === 'pending') ?? opps[0] ?? null;
      setOpportunity(featured);
      if (featured) {
        setCandidates(await fetchCandidateMatches(featured.required_skills));
      }
    } catch (err) {
      console.error('Failed to load recruiter dashboard:', err);
      showToast("Couldn't load your dashboard — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [profile, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchAllSkills()
      .then(setAllSkills)
      .catch((err) => console.error('Failed to load skills catalog:', err));
  }, []);

  function toggleSkill(id: string) {
    setSelectedSkillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetComposer() {
    setTitle('');
    setDescription('');
    setLocation('');
    setType('internship');
    setClosingDate('');
    setSelectedSkillIds(new Set());
    setShowComposer(false);
  }

  async function handlePost() {
    if (!profile) return;
    if (!title.trim()) {
      showToast('Give the opportunity a title first.');
      return;
    }
    if (closingDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(closingDate.trim())) {
      showToast('Closing date must be in YYYY-MM-DD format.');
      return;
    }
    setSubmitting(true);
    try {
      await createOpportunity({
        businessId: profile.id,
        company: profile.company || profile.full_name,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        type,
        closingDate: closingDate.trim() || null,
        skillIds: Array.from(selectedSkillIds),
      });
      showToast('Opportunity posted — awaiting admin approval.');
      resetComposer();
      await load();
    } catch (err) {
      console.error('Failed to post opportunity:', err);
      showToast("Couldn't post the opportunity — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.h1}>Recruiter Dashboard</Text>
        <Text style={[typography.bodyMuted, styles.subtitle]}>{profile?.company}</Text>

        <Pressable style={styles.newButton} onPress={() => setShowComposer((s) => !s)}>
          <Text style={styles.newButtonText}>
            {showComposer ? 'Cancel' : '+ Post new opportunity'}
          </Text>
        </Pressable>

        {showComposer && (
          <View style={styles.composer}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Junior Software Developer"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="What the role involves, requirements, etc."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Johannesburg, remote-friendly"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.pillRow}>
              {OPPORTUNITY_TYPES.map((t) => {
                const selected = t.value === type;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => setType(t.value)}
                    style={[styles.pill, selected && styles.pillSelected]}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Required skills</Text>
            <View style={styles.pillRow}>
              {allSkills.map((s) => {
                const selected = selectedSkillIds.has(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => toggleSkill(s.id)}
                    style={[styles.pill, selected && styles.pillSelected]}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{s.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Closing date (optional)</Text>
            <TextInput
              style={styles.input}
              value={closingDate}
              onChangeText={setClosingDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />

            <Pressable
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handlePost}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.submitButtonText}>Post opportunity</Text>
              )}
            </Pressable>
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />
        ) : !opportunity ? (
          <Text style={typography.bodyMuted}>No opportunities posted yet.</Text>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={typography.h2}>{opportunity.title}</Text>
                <View style={[styles.statusBadge, opportunity.status === 'pending' && styles.statusPending]}>
                  <Text style={styles.statusText}>{opportunity.status}</Text>
                </View>
              </View>
              <Text style={typography.bodyMuted}>
                {opportunity.type.replace('_', ' ')}
                {opportunity.location ? ` · ${opportunity.location}` : ''}
              </Text>
              {opportunity.description && (
                <Text style={[typography.body, styles.desc]}>{opportunity.description}</Text>
              )}
              <View style={styles.skillsRow}>
                {opportunity.required_skills.map((s) => (
                  <View key={s} style={styles.skillPill}>
                    <Text style={styles.skillText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={[typography.h3, styles.sectionTitle]}>
              Candidates ({candidates.length})
            </Text>
            {candidates.length === 0 ? (
              <Text style={typography.bodyMuted}>No student candidates yet.</Text>
            ) : (
              candidates.map((c) => (
                <View key={c.id} style={styles.candidateRow}>
                  <View style={styles.textCol}>
                    <Text style={typography.h3}>{c.fullName}</Text>
                    {c.headline && <Text style={typography.bodyMuted}>{c.headline}</Text>}
                  </View>
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchText}>{c.matchPercent}%</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        <Pressable style={styles.signOutButton} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  subtitle: { marginBottom: spacing.lg },
  loading: { marginTop: spacing.xl },
  newButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  newButtonText: { color: colors.textOnPrimary, fontWeight: '700' },
  composer: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  label: { ...typography.caption, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 15,
    color: colors.text,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { ...typography.body, fontSize: 13, fontWeight: '600' },
  pillTextSelected: { color: colors.textOnPrimary },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  statusBadge: {
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusPending: { backgroundColor: colors.warning },
  statusText: { color: colors.textOnPrimary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  desc: { marginTop: spacing.sm },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  skillPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  skillText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  sectionTitle: { marginBottom: spacing.sm },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  textCol: { flex: 1 },
  matchBadge: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  matchText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 12 },
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
