import { useState, useEffect, useCallback } from 'react';
import {
  getSession,
  signOut as authSignOut,
  type ManagedUserSession,
} from '../services/managedAuth';

interface BillingStatus {
  canGenerate: boolean;
  reason?: string;
  freeRemainingCents: number;
  hasPaymentMethod: boolean;
  currentMonthUsageCents: number;
}

export function useManaged() {
  const [session, setSession] = useState<ManagedUserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingStatus | null>(null);

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

  const refreshBilling = useCallback(async () => {
    try {
      const res = await fetch('/api/billing/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setBilling(data);
        return data;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  // Fetch billing status when session is available
  useEffect(() => {
    if (session) {
      refreshBilling();
    }
  }, [session, refreshBilling]);

  const signOut = useCallback(async () => {
    await authSignOut();
    setSession(null);
    setBilling(null);
  }, []);

  return {
    session,
    loading,
    isAuthenticated: !!session,
    billing,
    // Backwards compat: balance from billing status (usage this month in cents)
    balance: billing?.currentMonthUsageCents ?? 0,
    refreshSession,
    refreshBilling,
    // Keep old name for backwards compat
    refreshBalance: refreshBilling,
    signOut,
  };
}
