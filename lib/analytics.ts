import { supabase } from './supabase';

export type CountBreakdown = { label: string; count: number };

export type StudentEngagement = {
  totalStudents: number;
  avgReadinessPct: number;
  avgProfileCompletionPct: number;
  totalPosts: number;
  totalApplications: number;
};

export type AlumniEmployment = {
  totalAlumni: number;
  stageBreakdown: CountBreakdown[];
};

export type BusinessRecruitment = {
  totalBusinesses: number;
  opportunityStatusBreakdown: CountBreakdown[];
  totalApplications: number;
  topSkills: CountBreakdown[];
};

const STAGE_LABEL: Record<string, string> = {
  student: 'Student',
  internship: 'Internship',
  junior_dev: 'Junior Dev',
  dev: 'Developer',
  senior_dev: 'Senior Dev',
};

export async function fetchStudentEngagement(): Promise<StudentEngagement> {
  const { data: students, error: studentsError } = await supabase
    .from('profiles')
    .select('id, career_readiness_pct, profile_completion_pct')
    .eq('role', 'student');
  if (studentsError) throw studentsError;

  const studentIds = (students ?? []).map((s) => s.id);
  const totalStudents = studentIds.length;
  const avgReadinessPct = totalStudents
    ? Math.round(students!.reduce((sum, s) => sum + s.career_readiness_pct, 0) / totalStudents)
    : 0;
  const avgProfileCompletionPct = totalStudents
    ? Math.round(students!.reduce((sum, s) => sum + s.profile_completion_pct, 0) / totalStudents)
    : 0;

  let totalPosts = 0;
  let totalApplications = 0;
  if (studentIds.length > 0) {
    const [postsResult, applicationsResult] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).in('author_id', studentIds),
      supabase.from('applications').select('id', { count: 'exact', head: true }).in('student_id', studentIds),
    ]);
    if (postsResult.error) throw postsResult.error;
    if (applicationsResult.error) throw applicationsResult.error;
    totalPosts = postsResult.count ?? 0;
    totalApplications = applicationsResult.count ?? 0;
  }

  return { totalStudents, avgReadinessPct, avgProfileCompletionPct, totalPosts, totalApplications };
}

export async function fetchAlumniEmployment(): Promise<AlumniEmployment> {
  const { data, error } = await supabase
    .from('profiles')
    .select('current_stage')
    .eq('role', 'alumni')
    .eq('alumni_status', 'approved');
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const key = row.current_stage ?? 'unspecified';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const stageBreakdown = Array.from(counts.entries())
    .map(([key, count]) => ({ label: STAGE_LABEL[key] ?? 'Unspecified', count }))
    .sort((a, b) => b.count - a.count);

  return { totalAlumni: data?.length ?? 0, stageBreakdown };
}

export async function fetchBusinessRecruitment(): Promise<BusinessRecruitment> {
  const [businessesResult, opportunitiesResult, applicationsResult, opportunitySkillsResult] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'business').eq('business_status', 'approved'),
    supabase.from('opportunities').select('status'),
    supabase.from('applications').select('id', { count: 'exact', head: true }),
    supabase.from('opportunity_skills').select('skill:skills(name)'),
  ]);
  if (businessesResult.error) throw businessesResult.error;
  if (opportunitiesResult.error) throw opportunitiesResult.error;
  if (applicationsResult.error) throw applicationsResult.error;
  if (opportunitySkillsResult.error) throw opportunitySkillsResult.error;

  const statusCounts = new Map<string, number>();
  for (const row of opportunitiesResult.data ?? []) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  }
  const opportunityStatusBreakdown = Array.from(statusCounts.entries())
    .map(([label, count]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), count }))
    .sort((a, b) => b.count - a.count);

  const skillCounts = new Map<string, number>();
  for (const row of (opportunitySkillsResult.data ?? []) as unknown as { skill: { name: string } }[]) {
    const name = row.skill?.name;
    if (!name) continue;
    skillCounts.set(name, (skillCounts.get(name) ?? 0) + 1);
  }
  const topSkills = Array.from(skillCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalBusinesses: businessesResult.count ?? 0,
    opportunityStatusBreakdown,
    totalApplications: applicationsResult.count ?? 0,
    topSkills,
  };
}
