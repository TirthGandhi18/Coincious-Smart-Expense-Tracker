import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner';

export function AuthVerify() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function finish() {
      try {
        // After redirect, Supabase may have set a session
        const { data } = await supabase.auth.getSession();
        const session = data?.session ?? null;

        // Allow a brief delay for the DB trigger to insert public.users
        await new Promise((r) => setTimeout(r, 800));

        if (session && session.user?.id) {
          toast.success('Email confirmed. Redirecting to dashboard...');
          navigate('/dashboard');
        } else {
          toast.success('Email confirmed. Please login to continue.');
          navigate('/login');
        }
      } catch (err) {
        console.error(err);
        toast.error('Verification failed. Please login.');
        navigate('/login');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    finish();
    return () => { mounted = false; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Verifying your email…</h2>
        <p className="mt-2 text-sm text-muted-foreground">{loading ? 'Finalizing account...' : 'Redirecting...'}</p>
      </div>
    </div>
  );
}
