import { useState, useEffect, useCallback } from 'react';
import {
  getSession,
  signOut as authSignOut,
  type ManagedUserSession,
} from '../services/managedAuth';

export function useManaged() {
  const [session, setSession] = useState<ManagedUserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth state on mount
  useEffect(() => {
    getSession()
      .then(setSession)
      .finally(() => setLoading(false));
  }, []);

  const refreshSession = useCallback(async () => {
    const updated = await getSession();
    setSession(updated);
    return updated;
  }, []);

  const refreshBalance = useCallback(async () => {
    const updated = await getSession();
    if (updated) setSession(updated);
    return updated?.creditBalanceCents ?? 0;
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setSession(null);
  }, []);

  return {
    session,
    loading,
    isAuthenticated: !!session,
    balance: session?.creditBalanceCents ?? 0,
    refreshSession,
    refreshBalance,
    signOut,
  };
}
