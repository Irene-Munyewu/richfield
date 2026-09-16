import { supabase } from './supabase';

export async function setProfileVisibility(profileId: string, isPublic: boolean) {
  const { error } = await supabase.from('profiles').update({ is_public: isPublic }).eq('id', profileId);
  if (error) throw error;
}
