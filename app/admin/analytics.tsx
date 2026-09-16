import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchAlumniEmployment,
  fetchBusinessRecruitment,
  fetchStudentEngagement,
  type AlumniEmployment,
  type BusinessRecruitment,
  type StudentEngagement,
} from '../../lib/analytics';
import { useToast } from '../../lib/toast-context';
import { BarChart } from '../../components/BarChart';
import { StatTile } from '../../components/StatTile';
import { LoadingState } from '../../components/LoadingState';
import { colors, radius, spacing, typography } from '../../constants/theme';

type AnalyticsView = 'student' | 'alumni' | 'business';

const VIEWS: { value: AnalyticsView; label: string }[] = [
  { value: 'student', label: 'Student Engagement' },
  { value: 'alumni', label: 'Alumni Employment' },
  { value: 'business', label: 'Business Recruitment' },
];

export default function AdminAnalytics() {
  const { showToast } = useToast();
  const [view, setView] = useState<AnalyticsView>('student');
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentEngagement | null>(null);
  const [alumni, setAlumni] = useState<AlumniEmployment | null>(null);
  const [business, setBusiness] = useState<BusinessRecruitment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, b] = await Promise.all([
        fetchStudentEngagement(),
        fetchAlumniEmployment(),
        fetchBusinessRecruitment(),
      ]);
      setStudent(s);
      setAlumni(a);
      setBusiness(b);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      showToast("Couldn't load analytics — check your connection.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={typography.h1}>Analytics</Text>

        <View style={styles.tabRow}>
          {VIEWS.map((v) => {
            const selected = v.value === view;
            return (
              <Pressable
                key={v.value}
                onPress={() => setView(v.value)}
                style={[styles.tab, selected && styles.tabSelected]}
              >
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{v.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {view === 'student' && student && (
              <>
                <View style={styles.statsRow}>
                  <StatTile label="Students" value={student.totalStudents} />
                  <StatTile label="Avg readiness" value={`${student.avgReadinessPct}%`} />
                  <StatTile label="Avg profile" value={`${student.avgProfileCompletionPct}%`} />
                </View>
                <View style={styles.statsRow}>
                  <StatTile label="Posts" value={student.totalPosts} />
                  <StatTile label="Applications" value={student.totalApplications} />
                </View>
              </>
            )}

            {view === 'alumni' && alumni && (
              <>
                <View style={styles.statsRow}>
                  <StatTile label="Approved alumni" value={alumni.totalAlumni} />
                </View>
                <Text style={[typography.h3, styles.sectionTitle]}>By career stage</Text>
                <View style={styles.card}>
                  <BarChart data={alumni.stageBreakdown} color={colors.roleAlumni} />
                </View>
              </>
            )}

            {view === 'business' && business && (
              <>
                <View style={styles.statsRow}>
                  <StatTile label="Approved businesses" value={business.totalBusinesses} />
                  <StatTile label="Applications" value={business.totalApplications} />
                </View>
                <Text style={[typography.h3, styles.sectionTitle]}>Opportunities by status</Text>
                <View style={styles.card}>
                  <BarChart data={business.opportunityStatusBreakdown} color={colors.roleBusiness} />
                </View>
                <Text style={[typography.h3, styles.sectionTitle]}>Top requested skills</Text>
                <View style={styles.card}>
                  <BarChart data={business.topSkills} color={colors.roleBusiness} />
                </View>
              </>
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
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.lg },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tabSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...typography.body, fontSize: 13, fontWeight: '600' },
  tabTextSelected: { color: colors.textOnPrimary },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { marginTop: spacing.lg, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
});
