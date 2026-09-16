// One-off seed script for the 4 demo accounts (Phase 1).
//
// Deliberately uses the SAME public signUp()/signInWithPassword() flow the
// app itself uses — no service_role key needed. Each account signs itself
// in, then updates its own profiles row (allowed by the
// "profiles_update_own" RLS policy) and, for the student, inserts its own
// profile_skills rows (allowed by "profile_skills_mutate_own").
//
// Requires "Confirm email" to be OFF in Supabase Auth settings, otherwise
// signUp() won't return an active session to update with.
//
// Run:
//   node --env-file=.env scripts/seed-demo-accounts.mjs
//
// Safe to re-run: if an account already exists, it signs in instead of
// signing up, then re-applies the same profile update.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  console.error('Run with: node --env-file=.env scripts/seed-demo-accounts.mjs');
  process.exit(1);
}

const PASSWORD = 'RichfieldDemo1!';

// Gmail "+alias" addresses — all land in the same real inbox
// (worluchisom4real@gmail.com), so there's no dependency on fake domains.
const ACCOUNTS = [
  {
    email: 'worluchisom4real+student@gmail.com',
    role: 'student',
    full_name: 'Thabo Nkosi',
    profile: {
      headline: 'BSc Computer Science, Year 3',
      career_goal: 'Junior Software Developer',
      current_stage: 'student',
      career_readiness_pct: 62,
      profile_completion_pct: 70,
    },
    skills: {
      current: [
        { name: 'JavaScript', proficiency: 70 },
        { name: 'Git', proficiency: 60 },
        { name: 'Communication', proficiency: 80 },
        { name: 'Problem Solving', proficiency: 65 },
      ],
      gaps: [
        {
          name: 'React',
          why_it_matters: 'Most junior developer roles list React as a core requirement.',
          recommended_action: 'Complete a React fundamentals course and ship one small project.',
        },
        {
          name: 'SQL',
          why_it_matters: 'Data-driven roles expect comfort with basic queries.',
          recommended_action: 'Practice SELECT/JOIN queries against a sample database.',
        },
      ],
    },
  },
  {
    email: 'worluchisom4real+alumni@gmail.com',
    role: 'alumni',
    full_name: 'Naledi Mokoena',
    profile: {
      headline: 'Software Engineer @ Vantage Digital',
      company: 'Vantage Digital',
      current_stage: 'dev',
      career_readiness_pct: 100,
      profile_completion_pct: 100,
    },
  },
  {
    email: 'worluchisom4real+business@gmail.com',
    role: 'business',
    full_name: 'Lerato Dube',
    profile: {
      headline: 'Talent Acquisition Lead',
      company: 'TechNova Solutions',
    },
  },
  {
    email: 'worluchisom4real+admin@gmail.com',
    role: 'admin',
    full_name: 'Richfield Admin',
    profile: {},
  },
];

async function main() {
  for (const account of ACCOUNTS) {
    console.log(`\n--- ${account.role}: ${account.email} ---`);
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let userId = await signUpOrSignIn(supabase, account);
    if (!userId) continue;

    const { error: updateError } = await supabase
      .from('profiles')
      .update(account.profile)
      .eq('id', userId);
    if (updateError) {
      console.error(`  ✖ profile update failed: ${updateError.message}`);
    } else {
      console.log('  ✓ profile updated');
    }

    if (account.skills) {
      await seedSkills(supabase, userId, account.skills);
    }

    await supabase.auth.signOut();
  }

  console.log('\nDone. Demo password for all accounts:', PASSWORD);
}

async function signUpOrSignIn(supabase, account) {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: account.email,
    password: PASSWORD,
    options: { data: { role: account.role, full_name: account.full_name } },
  });

  if (!signUpError && signUpData.session) {
    console.log('  ✓ signed up (new account)');
    return signUpData.user.id;
  }

  // Already exists, or "Confirm email" is on and no session came back yet —
  // try signing in instead.
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: PASSWORD,
  });

  if (signInError || !signInData.session) {
    console.error(
      `  ✖ could not get a session (signUp: ${signUpError?.message ?? 'no session'}; ` +
        `signIn: ${signInError?.message ?? 'no session'}). ` +
        `Is "Confirm email" still ON in Supabase Auth settings?`
    );
    return null;
  }

  console.log('  ✓ signed in (already existed)');
  return signInData.user.id;
}

async function seedSkills(supabase, profileId, { current = [], gaps = [] }) {
  const names = [...current, ...gaps].map((s) => s.name);
  const { data: skillRows, error: skillsError } = await supabase
    .from('skills')
    .select('id, name')
    .in('name', names);

  if (skillsError) {
    console.error(`  ✖ could not look up skills: ${skillsError.message}`);
    return;
  }

  const idByName = Object.fromEntries(skillRows.map((s) => [s.name, s.id]));
  const rows = [
    ...current.map((s) => ({
      profile_id: profileId,
      skill_id: idByName[s.name],
      proficiency: s.proficiency,
      is_gap: false,
    })),
    ...gaps.map((s) => ({
      profile_id: profileId,
      skill_id: idByName[s.name],
      proficiency: 0,
      is_gap: true,
      why_it_matters: s.why_it_matters,
      recommended_action: s.recommended_action,
    })),
  ].filter((r) => r.skill_id); // skip anything not found in the skills table

  const { error: upsertError } = await supabase
    .from('profile_skills')
    .upsert(rows, { onConflict: 'profile_id,skill_id' });

  if (upsertError) {
    console.error(`  ✖ profile_skills upsert failed: ${upsertError.message}`);
  } else {
    console.log(`  ✓ ${rows.length} skill rows seeded`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
