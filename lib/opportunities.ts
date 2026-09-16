import { supabase } from './supabase';

export type Opportunity = {
  id: string;
  business_id: string;
  title: string;
  company: string;
  location: string | null;
  type: string;
  description: string | null;
  status: string;
  closing_date: string | null;
  required_skills: string[];
};

const OPPORTUNITY_SELECT =
  'id, business_id, title, company, location, type, description, status, closing_date, opportunity_skills(skill:skills(name))';

function mapOpportunityRow(o: any): Opportunity {
  return {
    id: o.id,
    business_id: o.business_id,
    title: o.title,
    company: o.company,
    location: o.location,
    type: o.type,
    description: o.description,
    status: o.status,
    closing_date: o.closing_date,
    required_skills: (o.opportunity_skills as { skill: { name: string } }[]).map((os) => os.skill.name),
  };
}

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(OPPORTUNITY_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOpportunityRow);
}

export async function fetchBusinessOpportunities(businessId: string): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(OPPORTUNITY_SELECT)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOpportunityRow);
}

export async function fetchPendingOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(OPPORTUNITY_SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOpportunityRow);
}

export async function approveOpportunity(id: string) {
  const { error } = await supabase.from('opportunities').update({ status: 'approved' }).eq('id', id);
  if (error) throw error;
}

export type NewOpportunity = {
  businessId: string;
  company: string;
  title: string;
  description: string;
  location: string;
  type: string;
  closingDate: string | null;
  skillIds: string[];
};

export async function createOpportunity(input: NewOpportunity): Promise<string> {
  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      business_id: input.businessId,
      company: input.company,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      type: input.type,
      closing_date: input.closingDate,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) throw error;

  if (input.skillIds.length > 0) {
    const { error: skillsError } = await supabase
      .from('opportunity_skills')
      .insert(input.skillIds.map((skill_id) => ({ opportunity_id: data.id, skill_id })));
    if (skillsError) throw skillsError;
  }

  return data.id;
}

/** matched skills ÷ required skills, rounded to a whole percent. */
export function computeMatchPercent(requiredSkills: string[], heldSkills: Set<string>): number {
  if (requiredSkills.length === 0) return 0;
  const matched = requiredSkills.filter((s) => heldSkills.has(s)).length;
  return Math.round((matched / requiredSkills.length) * 100);
}

export type CandidateMatch = {
  id: string;
  fullName: string;
  headline: string | null;
  matchPercent: number;
};

/** Ranks every student against a job's required skills — used by the recruiter dashboard. */
export async function fetchCandidateMatches(requiredSkills: string[]): Promise<CandidateMatch[]> {
  const { data: students, error } = await supabase
    .from('profiles')
    .select('id, full_name, headline')
    .eq('role', 'student');
  if (error) throw error;

  const results: CandidateMatch[] = [];
  for (const s of students ?? []) {
    const { data: skillRows } = await supabase
      .from('profile_skills')
      .select('skill:skills(name)')
      .eq('profile_id', s.id)
      .eq('is_gap', false);
    const held = new Set(
      ((skillRows ?? []) as unknown as { skill: { name: string } }[]).map((r) => r.skill.name)
    );
    results.push({
      id: s.id,
      fullName: s.full_name,
      headline: s.headline,
      matchPercent: computeMatchPercent(requiredSkills, held),
    });
  }
  return results.sort((a, b) => b.matchPercent - a.matchPercent);
}
