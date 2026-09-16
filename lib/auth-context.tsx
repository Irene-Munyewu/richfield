import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type PropsWithChildren,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Role } from '../types/profile';

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  company: string | null;
  career_goal: string | null;
  current_stage: string | null;
  career_readiness_pct: number;
  profile_completion_pct: number;
  cv_url: string | null;
  cv_score: number | null;
  cv_strengths: string[] | null;
  cv_gaps: string[] | null;
  cv_missing_skills: string[] | null;
  business_status: 'pending' | 'approved' | 'rejected' | null;
  alumni_status: 'pending' | 'approved' | null;
  is_public: boolean;
  popia_consent_at: string | null;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) {
      console.error('Failed to load profile:', error.message);
      setProfile(null);
      return;
    }
    setProfile(data as Profile);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session) await loadProfile(session.user.id);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, initializing, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
