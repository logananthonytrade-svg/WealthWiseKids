import { create } from 'zustand';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import supabase from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: 'parent' | 'child';
  created_at: string;
}

export interface ChildProfile {
  id: string;
  parent_id: string;
  name: string;
  birthdate: string;        // ISO date string 'YYYY-MM-DD'
  avatar_choice: number;    // 1-10
  created_at: string;
}

/** Calculates current age in years from a YYYY-MM-DD birthdate string */
export function getChildAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export interface AuthState {
  // ─── State ──────────────────────────────
  user: User | null;
  profile: Profile | null;
  selectedChild: ChildProfile | null;
  children: ChildProfile[];
  isLoading: boolean;
  consentGiven: boolean;

  // ─── Actions ────────────────────────────
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSelectedChild: (child: ChildProfile | null) => void;
  setChildren: (children: ChildProfile[]) => void;
  setIsLoading: (loading: boolean) => void;
  setConsentGiven: (value: boolean) => void;

  /** Called once on app mount — restores session and fetches profile. Returns unsubscribe fn. */
  initialize: () => Promise<() => void>;

  /** Loads the parent's child profiles from Supabase */
  loadChildren: (parentId: string) => Promise<void>;

  signOut: () => Promise<void>;
}

// ─── Store helpers (explicit to avoid implicit-any when zustand module is absent) ─
type SetFn = (partial: Partial<AuthState> | ((s: AuthState) => Partial<AuthState>)) => void;
type GetFn = () => AuthState;

// ─── Store ───────────────────────────────────────────────────────────────────

const useAuthStore = create<AuthState>()((set: SetFn, get: GetFn) => ({
  user: null,
  profile: null,
  selectedChild: null,
  children: [],
  isLoading: true,
  consentGiven: false,

  setUser: (user: User | null) => set({ user }),
  setProfile: (profile: Profile | null) => set({ profile }),
  setSelectedChild: (child: ChildProfile | null) => set({ selectedChild: child }),
  setChildren: (children: ChildProfile[]) => set({ children }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  setConsentGiven: (value: boolean) => set({ consentGiven: value }),

  initialize: async () => {
    set({ isLoading: true });
    try {
      // Check for an existing session stored in SecureStore
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({ user: session.user });

        // Fetch the user's profile record
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          set({ profile });
          // Pre-load children so the parent dashboard is ready instantly
          await get().loadChildren(session.user.id);
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ isLoading: false });
    }

    // Listen for auth changes (sign in / sign out / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_IN' && session?.user) {
        set({ user: session.user });

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          set({ profile });
          await get().loadChildren(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, selectedChild: null, children: [] });
      }
    });
    return () => subscription.unsubscribe();
  },

  loadChildren: async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from('child_profiles')
        .select('id, parent_id, name, birthdate, avatar_choice, created_at')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to load children:', error.message);
        return;
      }
      set({ children: data ?? [] });
    } catch (err) {
      console.error('loadChildren unexpected error:', err);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, selectedChild: null, children: [] });
  },
}));

export { useAuthStore as default };
