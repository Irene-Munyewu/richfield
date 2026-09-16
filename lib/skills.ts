import { supabase } from './supabase';

export type ProfileSkillRow = {
  id: string;
  proficiency: number;
  is_gap: boolean;
  why_it_matters: string | null;
  recommended_action: string | null;
  skill: { name: string; category: 'technical' | 'soft' };
};

export async function fetchProfileSkills(profileId: string): Promise<ProfileSkillRow[]> {
  const { data, error } = await supabase
    .from('profile_skills')
    .select('id, proficiency, is_gap, why_it_matters, recommended_action, skill:skills(name, category)')
    .eq('profile_id', profileId);

  if (error) throw error;
  return (data ?? []) as unknown as ProfileSkillRow[];
}

export type Skill = { id: string; name: string; category: 'technical' | 'soft' };

/** Full skills catalog — used by the opportunity composer's skill picker. */
export async function fetchAllSkills(): Promise<Skill[]> {
  const { data, error } = await supabase.from('skills').select('id, name, category').order('name');
  if (error) throw error;
  return (data ?? []) as Skill[];
}
