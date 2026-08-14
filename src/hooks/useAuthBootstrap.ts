import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useAuthBootstrap() {
  const { setSession, setOnboardingComplete, setStatus } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session) {
        setSession(data.session);
        const { data: companions } = await supabase
          .from('companions')
          .select('onboarding_complete')
          .eq('owner_id', data.session.user.id)
          .limit(1);

        const complete = companions?.[0]?.onboarding_complete ?? false;
        setOnboardingComplete(complete);
        setStatus(complete ? 'ready' : 'onboarding');
      } else {
        setSession(null);
        setStatus('unauthenticated');
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
      } else {
        useAuthStore.getState().reset();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setSession, setOnboardingComplete, setStatus]);
}
