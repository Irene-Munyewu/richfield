// Phase 4 seed: opportunities (owned by the demo business account) and
// alumni profiles + their career journeys.
//
// Same pattern as seed-demo-accounts.mjs — signs in as the accounts that
// own the rows (RLS requires business_id/alumni_id = auth.uid()), no
// service_role key needed.
//
// Run:
//   node --env-file=.env scripts/seed-phase4.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = 'RichfieldDemo1!';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Run with: node --env-file=.env scripts/seed-phase4.mjs');
  process.exit(1);
}

function client() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signUpOrSignIn(supabase, email, role, full_name) {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password: PASSWORD,
    options: { data: { role, full_name } },
  });
  if (!signUpError && signUpData.session) return signUpData.user.id;

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError || !signInData.session) {
    throw new Error(
      `Could not get a session for ${email} (signUp: ${signUpError?.message ?? 'no session'}; signIn: ${signInError?.message ?? 'no session'})`
    );
  }
  return signInData.user.id;
}

async function skillIdsByName(supabase, names) {
  const { data, error } = await supabase.from('skills').select('id, name').in('name', names);
  if (error) throw error;
  return Object.fromEntries(data.map((s) => [s.name, s.id]));
}

const OPPORTUNITIES = [
  {
    title: 'Software Engineering Intern',
    type: 'internship',
    location: 'Johannesburg, ZA',
    description: 'Rotate across the frontend and backend teams, shipping real features with mentorship.',
    status: 'approved',
    skills: ['JavaScript', 'Git', 'Problem Solving'],
  },
  {
    title: 'Junior Frontend Developer',
    type: 'full_time',
    location: 'Johannesburg, ZA',
    description: 'Build and maintain UI for our customer dashboard product using React.',
    status: 'approved',
    skills: ['JavaScript', 'React', 'Git'],
  },
  {
    title: 'Junior Backend Developer',
    type: 'full_time',
    location: 'Remote (ZA)',
    description: 'Own REST endpoints and data models for our internal tooling.',
    status: 'approved',
    skills: ['SQL', 'REST APIs', 'Python'],
  },
  {
    title: 'QA / Test Engineer Intern',
    type: 'internship',
    location: 'Johannesburg, ZA',
    description: 'Write test plans, automate regression checks, and work closely with developers.',
    status: 'approved',
    skills: ['Testing / QA', 'Communication'],
  },
  {
    title: 'Full Stack Developer Graduate Program',
    type: 'graduate',
    location: 'Cape Town, ZA',
    description: '12-month rotational graduate program across our product engineering teams.',
    status: 'pending', // the one to approve live on stage (Phase 6/7)
    // Deliberately includes JavaScript + Git (skills the seeded student
    // already holds) alongside React (a known gap) — a 0% required-skill
    // overlap here would mean approving it triggers no notification at
    // all, which would flatten the Phase 7 demo payoff.
    skills: ['JavaScript', 'Git', 'React'],
  },
];

const ALUMNI = [
  {
    email: 'worluchisom4real+alumni@gmail.com', // already exists from Phase 1
    full_name: 'Naledi Mokoena',
    headline: 'Software Engineer @ Vantage Digital',
    company: 'Vantage Digital',
    current_stage: 'dev',
    journey: [
      { year: '2019', stage_title: 'BSc Computer Science', stage_subtitle: 'Richfield', description: 'Focused on web fundamentals and two group capstone projects.' },
      { year: '2020', stage_title: 'Junior Developer Intern', stage_subtitle: 'Vantage Digital', description: '3-month internship shipping small UI fixes and learning the codebase.' },
      { year: '2021', stage_title: 'Junior Developer', stage_subtitle: 'Vantage Digital', description: 'Owned first features end-to-end, paired closely with senior engineers.' },
      { year: '2023', stage_title: 'Software Engineer', stage_subtitle: 'Vantage Digital', description: 'Leads a squad of three on the customer dashboard product.' },
    ],
  },
  {
    email: 'worluchisom4real+alumni2@gmail.com',
    full_name: 'Sipho Radebe',
    headline: 'Junior Developer @ BrightPath Systems',
    company: 'BrightPath Systems',
    current_stage: 'junior_dev',
    journey: [
      { year: '2021', stage_title: 'BSc Information Technology', stage_subtitle: 'Richfield', description: null },
      { year: '2022', stage_title: 'Software Engineering Intern', stage_subtitle: 'BrightPath Systems', description: 'First exposure to a production codebase and agile ceremonies.' },
      { year: '2023', stage_title: 'Junior Developer', stage_subtitle: 'BrightPath Systems', description: 'Builds REST APIs for the internal logistics platform.' },
    ],
  },
  {
    email: 'worluchisom4real+alumni3@gmail.com',
    full_name: 'Ayanda Khumalo',
    headline: 'Senior Developer @ Coretech Labs',
    company: 'Coretech Labs',
    current_stage: 'senior_dev',
    journey: [
      { year: '2016', stage_title: 'BSc Computer Science', stage_subtitle: 'Richfield', description: null },
      { year: '2017', stage_title: 'Graduate Developer', stage_subtitle: 'Coretech Labs', description: null },
      { year: '2019', stage_title: 'Developer', stage_subtitle: 'Coretech Labs', description: null },
      { year: '2022', stage_title: 'Senior Developer', stage_subtitle: 'Coretech Labs', description: 'Leads architecture decisions for the payments team.' },
    ],
  },
];

async function seedOpportunities() {
  console.log('\n--- Opportunities (business account) ---');
  const supabase = client();
  const businessId = await signUpOrSignIn(
    supabase,
    'worluchisom4real+business@gmail.com',
    'business',
    'Lerato Dube'
  );

  const allSkillNames = [...new Set(OPPORTUNITIES.flatMap((o) => o.skills))];
  const skillIds = await skillIdsByName(supabase, allSkillNames);

  for (const opp of OPPORTUNITIES) {
    const { data: existing } = await supabase
      .from('opportunities')
      .select('id')
      .eq('business_id', businessId)
      .eq('title', opp.title)
      .maybeSingle();

    let opportunityId = existing?.id;
    if (!opportunityId) {
      const { data: inserted, error: insertError } = await supabase
        .from('opportunities')
        .insert({
          business_id: businessId,
          title: opp.title,
          company: 'TechNova Solutions',
          location: opp.location,
          type: opp.type,
          description: opp.description,
          status: opp.status,
        })
        .select('id')
        .single();
      if (insertError) {
        console.error(`  ✖ ${opp.title}: ${insertError.message}`);
        continue;
      }
      opportunityId = inserted.id;
      console.log(`  ✓ created "${opp.title}" (${opp.status})`);
    } else {
      console.log(`  • "${opp.title}" already exists`);
    }

    // Delete + re-insert (not upsert) so re-running always matches the
    // current OPPORTUNITIES definition exactly — an upsert alone would
    // leave stale skill associations behind if a skill list changes.
    await supabase.from('opportunity_skills').delete().eq('opportunity_id', opportunityId);
    const rows = opp.skills
      .map((name) => ({ opportunity_id: opportunityId, skill_id: skillIds[name] }))
      .filter((r) => r.skill_id);
    const { error: skillsError } = await supabase.from('opportunity_skills').insert(rows);
    if (skillsError) console.error(`    ✖ skills for "${opp.title}": ${skillsError.message}`);
  }

  await supabase.auth.signOut();
}

async function seedAlumni() {
  for (const alum of ALUMNI) {
    console.log(`\n--- alumni: ${alum.email} ---`);
    const supabase = client();
    const alumniId = await signUpOrSignIn(supabase, alum.email, 'alumni', alum.full_name);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        headline: alum.headline,
        company: alum.company,
        current_stage: alum.current_stage,
        career_readiness_pct: 100,
        profile_completion_pct: 100,
      })
      .eq('id', alumniId);
    if (updateError) console.error(`  ✖ profile update: ${updateError.message}`);
    else console.log('  ✓ profile updated');

    const rows = alum.journey.map((stage, index) => ({
      alumni_id: alumniId,
      stage_order: index,
      year: stage.year,
      stage_title: stage.stage_title,
      stage_subtitle: stage.stage_subtitle,
      description: stage.description,
    }));

    // Clear and re-insert this alumnus's journey so re-running the script
    // doesn't duplicate stages.
    await supabase.from('alumni_journey').delete().eq('alumni_id', alumniId);
    const { error: journeyError } = await supabase.from('alumni_journey').insert(rows);
    if (journeyError) console.error(`  ✖ journey: ${journeyError.message}`);
    else console.log(`  ✓ ${rows.length} journey stages seeded`);

    await supabase.auth.signOut();
  }
}

async function main() {
  await seedOpportunities();
  await seedAlumni();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
