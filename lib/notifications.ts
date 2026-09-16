import { supabase } from './supabase';
import { fetchCandidateMatches } from './opportunities';

export type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
};

export async function fetchNotifications(profileId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, type, is_read, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
}

export async function countUnread(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Called right after an admin approves an opportunity. No realtime/websocket
 * infra (explicitly out of scope) — this just inserts rows; the student's
 * side picks them up on next fetch (screen focus), which is what the demo
 * script's "switch back to Student" step naturally triggers.
 */
export async function notifyMatchingStudents(opportunity: {
  title: string;
  company: string;
  required_skills: string[];
}) {
  const candidates = await fetchCandidateMatches(opportunity.required_skills);
  const matched = candidates.filter((c) => c.matchPercent >= 50);
  if (matched.length === 0) return;

  const rows = matched.map((c) => ({
    profile_id: c.id,
    title: 'New job match',
    body: `${opportunity.title} at ${opportunity.company} just opened — ${c.matchPercent}% match for you.`,
    type: 'job_match',
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) throw error;
}

/** Called right after a student applies to an opportunity — tells the business who applied and how well they match. */
export async function notifyBusinessOfApplication(
  businessId: string,
  studentName: string,
  opportunityTitle: string,
  matchPercent: number
) {
  const { error } = await supabase.from('notifications').insert({
    profile_id: businessId,
    title: 'New application',
    body: `${studentName} applied for "${opportunityTitle}" — ${matchPercent}% match.`,
    type: 'new_application',
  });
  if (error) throw error;
}

/** Called right after an admin approves a pending alumni account. */
export async function notifyAlumniApproved(alumniId: string) {
  const { error } = await supabase.from('notifications').insert({
    profile_id: alumniId,
    title: 'Alumni account approved',
    body: "You're approved — you now appear in the alumni network.",
    type: 'alumni_status',
  });
  if (error) throw error;
}

/** Called right after an admin approves or rejects a pending business account. */
export async function notifyBusinessStatus(businessId: string, status: 'approved' | 'rejected') {
  const { error } = await supabase.from('notifications').insert({
    profile_id: businessId,
    title: status === 'approved' ? 'Business account approved' : 'Business account rejected',
    body:
      status === 'approved'
        ? "You're approved — your recruiter dashboard is now unlocked."
        : 'Your business registration was not approved. Contact support if you think this is a mistake.',
    type: 'business_status',
  });
  if (error) throw error;
}
