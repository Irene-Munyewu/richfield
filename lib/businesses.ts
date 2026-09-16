import { supabase } from './supabase';

export type PendingBusiness = {
  id: string;
  full_name: string;
  email: string;
  company: string | null;
  created_at: string;
};

export async function fetchPendingBusinesses(): Promise<PendingBusiness[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, company, created_at')
    .eq('role', 'business')
    .eq('business_status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function approveBusiness(id: string) {
  const { error } = await supabase.from('profiles').update({ business_status: 'approved' }).eq('id', id);
  if (error) throw error;
}

export async function rejectBusiness(id: string) {
  const { error } = await supabase.from('profiles').update({ business_status: 'rejected' }).eq('id', id);
  if (error) throw error;
}
