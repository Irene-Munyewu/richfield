// Supabase Edge Function: ai-proxy
//
// The ONLY place the Gemini API key is ever read. The Expo app never talks
// to Gemini directly — it calls this function via
//   supabase.functions.invoke('ai-proxy', { body: { mode, ... } })
// and the caller's Supabase auth JWT is verified automatically by the
// platform before this code even runs (deployed WITHOUT --no-verify-jwt).
//
// Two modes:
//   mode: "chat"         -> AI Career Coach conversation
//   mode: "cv_analysis"  -> structured CV scoring
//
// Deploy:
//   supabase functions deploy ai-proxy
// Secret (set once, never committed):
//   supabase secrets set GEMINI_API_KEY=your-key-here

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ChatMessage = { role: 'user' | 'model'; content: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!GEMINI_API_KEY) {
    return jsonResponse({ error: 'GEMINI_API_KEY secret not set on this function' }, 500);
  }

  try {
    // Identify the caller from their auth header, so prompts can be scoped
    // to their own profile — never trust a profileId passed in the body.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return jsonResponse({ error: 'Invalid or expired session' }, 401);

    const body = await req.json();

    if (body.mode === 'chat') {
      return await handleChat(supabase, user.id, body.messages ?? []);
    }
    if (body.mode === 'cv_analysis') {
      return await handleCvAnalysis(body.fileBase64, body.mimeType ?? 'application/pdf');
    }
    return jsonResponse({ error: 'Unknown mode. Use "chat" or "cv_analysis".' }, 400);
  } catch (err) {
    console.error('ai-proxy error:', err);
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});

async function handleChat(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  messages: ChatMessage[]
) {
  // Pull the profile facts that make answers feel personalized.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, career_goal, current_stage, career_readiness_pct, profile_completion_pct, cv_score, cv_gaps')
    .eq('id', userId)
    .single();

  const systemPrompt = buildCoachSystemPrompt(profile);

  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    }),
  });

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    console.error('Gemini chat error:', errText);
    return jsonResponse({ error: 'AI Coach is unavailable right now' }, 502);
  }

  const data = await geminiRes.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return jsonResponse({ reply });
}

function buildCoachSystemPrompt(profile: Record<string, unknown> | null): string {
  // TODO(Phase 3): replace/extend with the approved system prompt.
  // Kept short here on purpose — personalization comes from the profile
  // fields injected below, not from prompt length.
  if (!profile) {
    return 'You are the Richfield Connect AI Career Coach. Be concise, encouraging, and practical.';
  }
  return [
    'You are the Richfield Connect AI Career Coach for this student.',
    `Name: ${profile.full_name ?? 'the student'}`,
    `Career goal: ${profile.career_goal ?? 'not set'}`,
    `Current stage: ${profile.current_stage ?? 'student'}`,
    `Career readiness: ${profile.career_readiness_pct ?? 0}%`,
    `Profile completion: ${profile.profile_completion_pct ?? 0}%`,
    `CV score: ${profile.cv_score ?? 'not yet scored'}`,
    `Known skill gaps: ${(profile.cv_gaps as string[] | null)?.join(', ') || 'none recorded'}`,
    'Reference these specifics naturally in answers. Be concise, encouraging, and practical — this is a live demo, keep replies short.',
  ].join('\n');
}

async function handleCvAnalysis(fileBase64: string | undefined, mimeType: string) {
  if (!fileBase64) return jsonResponse({ error: 'Missing fileBase64' }, 400);

  const prompt = [
    'Analyze this CV/resume for a student or early-career applicant.',
    'Return ONLY JSON matching this exact shape, no prose:',
    '{"score": number (0-100), "strengths": string[], "gaps": string[], "missingSkills": string[]}',
  ].join('\n');

  const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: fileBase64 } }],
        },
      ],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    console.error('Gemini CV analysis error:', errText);
    return jsonResponse({ error: 'CV analysis is unavailable right now' }, 502);
  }

  const data = await geminiRes.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  try {
    const parsed = JSON.parse(text);
    return jsonResponse(parsed);
  } catch {
    console.error('Failed to parse Gemini JSON:', text);
    return jsonResponse({ error: 'AI returned an unexpected format' }, 502);
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
