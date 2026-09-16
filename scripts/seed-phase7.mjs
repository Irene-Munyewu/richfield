// Phase 7 seed: a couple of already-read notifications for the student, so
// the list isn't empty before the demo's live admin-approval notification
// arrives. Seeded as read on purpose — that live one should be the only
// unread badge the presenter sees.
//
// Run:
//   node --env-file=.env scripts/seed-phase7.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = 'RichfieldDemo1!';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Run with: node --env-file=.env scripts/seed-phase7.mjs');
  process.exit(1);
}

const NOTIFICATIONS = [
  {
    title: 'Welcome to Richfield Rise',
    body: 'Your dashboard, AI Coach, and career pathway are ready to explore.',
    type: 'general',
  },
  {
    title: 'Weekly tip',
    body: 'Keep your CV up to date — it keeps your score and skill gaps accurate.',
    type: 'tip',
  },
];

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'worluchisom4real+student@gmail.com',
    password: PASSWORD,
  });
  if (signInErr) {
    console.error('sign in failed:', signInErr.message);
    process.exit(1);
  }

  for (const n of NOTIFICATIONS) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('profile_id', signIn.user.id)
      .eq('title', n.title)
      .maybeSingle();

    if (existing) {
      console.log(`• "${n.title}" already exists`);
      continue;
    }

    const { error } = await supabase.from('notifications').insert({
      profile_id: signIn.user.id,
      title: n.title,
      body: n.body,
      type: n.type,
      is_read: true,
    });
    if (error) console.error(`✖ "${n.title}": ${error.message}`);
    else console.log(`✓ seeded "${n.title}"`);
  }

  await supabase.auth.signOut();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
