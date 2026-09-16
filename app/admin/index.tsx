import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { approveOpportunity, fetchPendingOpportunities, type Opportunity } from '../../lib/opportunities';
import { approveBusiness, fetchPendingBusinesses, rejectBusiness, type PendingBusiness } from '../../lib/businesses';
import { approveAlumni, fetchPendingAlumni, type PendingAlumni } from '../../lib/alumni';
import { createEvent } from '../../lib/events';
import { dismissReport, fetchOpenReports, removeReportedPost, suspendReportedAuthor, type OpenReport } from '../../lib/reports';
import { notifyMatchingStudents, notifyBusinessStatus, notifyAlumniApproved } from '../../lib/notifications';
import { useToast } from '../../lib/toast-context';
import { colors, radius, shadow, spacing, typography } from '../../constants/theme';

export default function AdminScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { showToast } = useToast();
  const [pending, setPending] = useState<Opportunity[]>([]);
  const [pendingBusinesses, setPendingBusinesses] = useState<PendingBusiness[]>([]);
  const [pendingAlumni, setPendingAlumni] = useState<PendingAlumni[]>([]);
  const [openReports, setOpenReports] = useState<OpenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [businessActionId, setBusinessActionId] = useState<string | null>(null);
  const [alumniActionId, setAlumniActionId] = useState<string | null>(null);
  const [reportActionId, setReportActionId] = useState<string | null>(null);

  const [showEventComposer, setShowEventComposer] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventSubmitting, setEventSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [opps, businesses, alumni, reports] = await Promise.all([
        fetchPendingOpportunities(),
        fetchPendingBusinesses(),
        fetchPendingAlumni(),
        fetchOpenReports(),
      ]);
      setPending(opps);
      setPendingBusinesses(businesses);
      setPendingAlumni(alumni);
      setOpenReports(reports);
    } catch (err) {
      console.error('Failed to load pending items:', err);
      showToast("Couldn't load pending items — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(o: Opportunity) {
    setApprovingId(o.id);
    try {
      await approveOpportunity(o.id);
      setPending((prev) => prev.filter((p) => p.id !== o.id));
      try {
        await notifyMatchingStudents(o);
      } catch (notifyErr) {
        // The approval itself succeeded — a failed notification insert
        // shouldn't look like the approve failed.
        console.error('Failed to notify matching students:', notifyErr);
      }
      showToast(`Approved "${o.title}" — matching students notified.`);
    } catch (err) {
      console.error('Approve failed:', err);
      showToast('Approve failed — please try again.');
    } finally {
      setApprovingId(null);
    }
  }

  async function handleBusinessDecision(b: PendingBusiness, status: 'approved' | 'rejected') {
    setBusinessActionId(b.id);
    try {
      if (status === 'approved') await approveBusiness(b.id);
      else await rejectBusiness(b.id);
      setPendingBusinesses((prev) => prev.filter((p) => p.id !== b.id));
      try {
        await notifyBusinessStatus(b.id, status);
      } catch (notifyErr) {
        console.error('Failed to notify business of decision:', notifyErr);
      }
      showToast(status === 'approved' ? `Approved ${b.full_name}.` : `Rejected ${b.full_name}.`);
    } catch (err) {
      console.error('Business decision failed:', err);
      showToast('Action failed — please try again.');
    } finally {
      setBusinessActionId(null);
    }
  }

  async function handleAlumniApprove(a: PendingAlumni) {
    setAlumniActionId(a.id);
    try {
      await approveAlumni(a.id);
      setPendingAlumni((prev) => prev.filter((p) => p.id !== a.id));
      try {
        await notifyAlumniApproved(a.id);
      } catch (notifyErr) {
        console.error('Failed to notify alumni of approval:', notifyErr);
      }
      showToast(`Approved ${a.full_name} — now visible in the alumni network.`);
    } catch (err) {
      console.error('Alumni approval failed:', err);
      showToast('Approve failed — please try again.');
    } finally {
      setAlumniActionId(null);
    }
  }

  async function handleDismissReport(r: OpenReport) {
    setReportActionId(r.id);
    try {
      await dismissReport(r.id);
      setOpenReports((prev) => prev.filter((p) => p.id !== r.id));
    } catch (err) {
      console.error('Dismiss report failed:', err);
      showToast('Action failed — please try again.');
    } finally {
      setReportActionId(null);
    }
  }

  async function handleRemovePost(r: OpenReport) {
    setReportActionId(r.id);
    try {
      await removeReportedPost(r.post_id);
      // Removing the post cascades to every report against it, not just this one.
      setOpenReports((prev) => prev.filter((p) => p.post_id !== r.post_id));
      showToast('Post removed.');
    } catch (err) {
      console.error('Remove post failed:', err);
      showToast('Action failed — please try again.');
    } finally {
      setReportActionId(null);
    }
  }

  async function handleSuspendAuthor(r: OpenReport) {
    setReportActionId(r.id);
    try {
      await suspendReportedAuthor(r.id, r.author_id);
      setOpenReports((prev) => prev.filter((p) => p.id !== r.id));
      showToast(`Suspended ${r.author_name}.`);
    } catch (err) {
      console.error('Suspend author failed:', err);
      showToast('Action failed — please try again.');
    } finally {
      setReportActionId(null);
    }
  }

  async function handleCreateEvent() {
    if (!profile) return;
    if (!eventTitle.trim()) {
      showToast('Give the event a title first.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate.trim())) {
      showToast('Event date must be in YYYY-MM-DD format.');
      return;
    }
    setEventSubmitting(true);
    try {
      await createEvent({
        createdBy: profile.id,
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        location: eventLocation.trim(),
        eventDate: eventDate.trim(),
      });
      showToast('Event created.');
      setEventTitle('');
      setEventDescription('');
      setEventLocation('');
      setEventDate('');
      setShowEventComposer(false);
    } catch (err) {
      console.error('Failed to create event:', err);
      showToast("Couldn't create the event — please try again.");
    } finally {
      setEventSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.h1}>Admin</Text>
        <Text style={[typography.bodyMuted, styles.subtitle]}>Pending opportunities awaiting approval.</Text>

        <View style={styles.headerButtonsRow}>
          <Pressable style={styles.newButton} onPress={() => setShowEventComposer((s) => !s)}>
            <Text style={styles.newButtonText}>{showEventComposer ? 'Cancel' : '+ Create event'}</Text>
          </Pressable>
          <Pressable style={styles.analyticsButton} onPress={() => router.push('/admin/analytics')}>
            <Text style={styles.analyticsButtonText}>Analytics</Text>
          </Pressable>
        </View>

        {showEventComposer && (
          <View style={styles.composer}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="Careers Fair 2026"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={eventDescription}
              onChangeText={setEventDescription}
              placeholder="What the event is about"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={eventLocation}
              onChangeText={setEventLocation}
              placeholder="Richfield Campus, Hall A"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={eventDate}
              onChangeText={setEventDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />

            <Pressable
              style={[styles.submitButton, eventSubmitting && styles.submitButtonDisabled]}
              onPress={handleCreateEvent}
              disabled={eventSubmitting}
            >
              {eventSubmitting ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.submitButtonText}>Create event</Text>
              )}
            </Pressable>
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />
        ) : (
          <>
        <Text style={[typography.h3, styles.sectionTitle]}>Reported posts</Text>
        {openReports.length === 0 ? (
          <Text style={[typography.bodyMuted, styles.subtitle]}>Nothing pending — all caught up.</Text>
        ) : (
          openReports.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={typography.h3}>{r.author_name}</Text>
              <Text style={[typography.body, styles.desc]}>{r.post_content}</Text>
              <View style={styles.reportActionsRow}>
                <Pressable
                  style={[styles.dismissButton, styles.reportActionButton]}
                  onPress={() => handleDismissReport(r)}
                  disabled={reportActionId === r.id}
                >
                  <Text style={styles.dismissText}>Dismiss</Text>
                </Pressable>
                <Pressable
                  style={[styles.rejectButton, styles.reportActionButton]}
                  onPress={() => handleRemovePost(r)}
                  disabled={reportActionId === r.id}
                >
                  <Text style={styles.rejectText}>Remove</Text>
                </Pressable>
                <Pressable
                  style={[styles.approveButton, styles.reportActionButton]}
                  onPress={() => handleSuspendAuthor(r)}
                  disabled={reportActionId === r.id}
                >
                  {reportActionId === r.id ? (
                    <ActivityIndicator size="small" color={colors.textOnPrimary} />
                  ) : (
                    <Text style={styles.approveText}>Suspend</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={[typography.h3, styles.sectionTitle]}>Pending businesses</Text>
        {pendingBusinesses.length === 0 ? (
          <Text style={[typography.bodyMuted, styles.subtitle]}>Nothing pending — all caught up.</Text>
        ) : (
          pendingBusinesses.map((b) => (
            <View key={b.id} style={styles.card}>
              <Text style={typography.h3}>{b.full_name}</Text>
              <Text style={typography.bodyMuted}>{b.company || b.email}</Text>
              <View style={styles.businessActionsRow}>
                <Pressable
                  style={[styles.approveButton, styles.businessActionButton]}
                  onPress={() => handleBusinessDecision(b, 'approved')}
                  disabled={businessActionId === b.id}
                >
                  {businessActionId === b.id ? (
                    <ActivityIndicator size="small" color={colors.textOnPrimary} />
                  ) : (
                    <Text style={styles.approveText}>Approve</Text>
                  )}
                </Pressable>
                <Pressable
                  style={[styles.rejectButton, styles.businessActionButton]}
                  onPress={() => handleBusinessDecision(b, 'rejected')}
                  disabled={businessActionId === b.id}
                >
                  <Text style={styles.rejectText}>Reject</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={[typography.h3, styles.sectionTitle]}>Pending alumni</Text>
        {pendingAlumni.length === 0 ? (
          <Text style={[typography.bodyMuted, styles.subtitle]}>Nothing pending — all caught up.</Text>
        ) : (
          pendingAlumni.map((a) => (
            <View key={a.id} style={styles.card}>
              <Text style={typography.h3}>{a.full_name}</Text>
              <Text style={typography.bodyMuted}>{a.company || a.email}</Text>
              <Pressable
                style={styles.approveButton}
                onPress={() => handleAlumniApprove(a)}
                disabled={alumniActionId === a.id}
              >
                {alumniActionId === a.id ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                ) : (
                  <Text style={styles.approveText}>Approve</Text>
                )}
              </Pressable>
            </View>
          ))
        )}

        <Text style={[typography.h3, styles.sectionTitle]}>Pending opportunities</Text>
        {pending.length === 0 ? (
          <Text style={typography.bodyMuted}>Nothing pending — all caught up.</Text>
        ) : (
          pending.map((o) => (
            <View key={o.id} style={styles.card}>
              <Text style={typography.h3}>{o.title}</Text>
              <Text style={typography.bodyMuted}>
                {o.company} · {o.type.replace('_', ' ')}
                {o.location ? ` · ${o.location}` : ''}
              </Text>
              {o.description && <Text style={[typography.body, styles.desc]}>{o.description}</Text>}
              <View style={styles.skillsRow}>
                {o.required_skills.map((s) => (
                  <View key={s} style={styles.skillPill}>
                    <Text style={styles.skillText}>{s}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                style={styles.approveButton}
                onPress={() => handleApprove(o)}
                disabled={approvingId === o.id}
              >
                {approvingId === o.id ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                ) : (
                  <Text style={styles.approveText}>Approve</Text>
                )}
              </Pressable>
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
  headerButtonsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  newButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  newButtonText: { color: colors.textOnPrimary, fontWeight: '700' },
  analyticsButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  analyticsButtonText: { color: colors.text, fontWeight: '700' },
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
    marginBottom: spacing.md,
    ...shadow.card,
  },
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
  approveButton: {
    marginTop: spacing.md,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  approveText: { color: colors.textOnPrimary, fontWeight: '700' },
  businessActionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  businessActionButton: { flex: 1, marginTop: 0 },
  reportActionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  reportActionButton: { flex: 1, marginTop: 0 },
  dismissButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  dismissText: { color: colors.textMuted, fontWeight: '700' },
  rejectButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  rejectText: { color: colors.danger, fontWeight: '700' },
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
