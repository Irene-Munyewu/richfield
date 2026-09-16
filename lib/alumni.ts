import { supabase } from './supabase';

export type AlumniProfile = {
  id: string;
  full_name: string;
  headline: string | null;
  company: string | null;
  current_stage: string | null;
};

export async function fetchAlumni(): Promise<AlumniProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, headline, company, current_stage')
    .eq('role', 'alumni')
    .eq('alumni_status', 'approved')
    .eq('is_public', true);
  if (error) throw error;
  return data ?? [];
}

export type PendingAlumni = {
  id: string;
  full_name: string;
  email: string;
  company: string | null;
  created_at: string;
};

export async function fetchPendingAlumni(): Promise<PendingAlumni[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, company, created_at')
    .eq('role', 'alumni')
    .eq('alumni_status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function approveAlumni(id: string) {
  const { error } = await supabase.from('profiles').update({ alumni_status: 'approved' }).eq('id', id);
  if (error) throw error;
}

export type AlumniJourneyStage = {
  id: string;
  stage_order: number;
  year: string | null;
  stage_title: string;
  stage_subtitle: string | null;
  description: string | null;
};

export async function fetchAlumniJourney(alumniId: string): Promise<AlumniJourneyStage[]> {
  const { data, error } = await supabase
    .from('alumni_journey')
    .select('id, stage_order, year, stage_title, stage_subtitle, description')
    .eq('alumni_id', alumniId)
    .order('stage_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
