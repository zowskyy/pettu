import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'authenticated'
  | 'onboarding'
  | 'ready';

interface AuthState {
  session: Session | null;
  user: User | null;
  status: AuthStatus;
  onboardingComplete: boolean;
  setSession: (session: Session | null) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setStatus: (status: AuthStatus) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  status: 'loading',
  onboardingComplete: false,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      status: session ? 'authenticated' : 'unauthenticated',
    }),
  setOnboardingComplete: (complete) =>
    set({
      onboardingComplete: complete,
      status: complete ? 'ready' : 'onboarding',
    }),
  setStatus: (status) => set({ status }),
  reset: () =>
    set({
      session: null,
      user: null,
      status: 'unauthenticated',
      onboardingComplete: false,
    }),
}));
