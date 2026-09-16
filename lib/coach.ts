import { supabase } from './supabase';

export type ChatMessage = { role: 'user' | 'model'; content: string };

export async function sendCoachMessage(messages: ChatMessage[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { mode: 'chat', messages },
  });
  if (error) throw new Error(`AI Coach failed: ${error.message}`);
  if (data?.error) throw new Error(data.error);
  return data.reply ?? '';
}
