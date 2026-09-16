// Phase 5 seed: 5 career-update style posts, spread across existing demo
// accounts. Comments/reactions are deliberately left empty — that's the
// live-clickable part of the demo (Phase 9 demo flow, step 9).
//
// Run:
//   node --env-file=.env scripts/seed-phase5.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = 'RichfieldDemo1!';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Run with: node --env-file=.env scripts/seed-phase5.mjs');
  process.exit(1);
}

const POSTS = [
  {
    email: 'worluchisom4real+alumni@gmail.com', // Naledi Mokoena
    content: 'Just shipped a redesign of our customer dashboard 🎉 Huge shoutout to my team at Vantage Digital.',
  },
  {
    email: 'worluchisom4real+alumni2@gmail.com', // Sipho Radebe
    content: "Hit a milestone today — merged my first PR into BrightPath's core logistics service!",
  },
  {
    email: 'worluchisom4real+alumni3@gmail.com', // Ayanda Khumalo
    content:
      "Mentoring two new grads this quarter. If you're early in your career, don't be afraid to ask \"silly\" questions — that's how you learn fastest.",
  },
  {
    email: 'worluchisom4real+business@gmail.com', // Lerato Dube / TechNova
    content: "We're hiring! TechNova Solutions just opened 4 new roles for junior developers and interns. Check the Jobs tab 👀",
  },
  {
    email: 'worluchisom4real+student@gmail.com', // Thabo Nkosi
    content: 'Just finished my first React tutorial series — excited to start applying it to real projects!',
  },
];

async function signUpOrSignIn(supabase, email) {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError || !signInData.session) {
    throw new Error(`Could not sign in as ${email}: ${signInError?.message ?? 'no session'}`);
  }
  return signInData.user.id;
}

async function main() {
  for (const post of POSTS) {
    console.log(`--- post by ${post.email} ---`);
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const authorId = await signUpOrSignIn(supabase, post.email);

    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', authorId)
      .eq('content', post.content)
      .maybeSingle();

    if (existing) {
      console.log('  • already exists, skipping');
    } else {
      const { error } = await supabase.from('posts').insert({ author_id: authorId, content: post.content });
      if (error) console.error(`  ✖ ${error.message}`);
      else console.log('  ✓ posted');
    }
    await supabase.auth.signOut();
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
