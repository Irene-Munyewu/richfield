import { supabase } from './supabase';

export async function fetchMyApplicationIds(studentId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('applications').select('opportunity_id').eq('student_id', studentId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.opportunity_id));
}

export async function applyToOpportunity(opportunityId: string, studentId: string) {
  const { error } = await supabase
    .from('applications')
    .insert({ opportunity_id: opportunityId, student_id: studentId });
  if (error) throw error;
}
