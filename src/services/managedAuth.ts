export interface ManagedUserSession {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  creditBalanceCents: number;
}

// Fetch the current user session from the server.
// Returns null if not authenticated (cookie missing or expired).
export async function getSession(): Promise<ManagedUserSession | null> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Redirect to Google OAuth sign-in
export function signInWithGoogle() {
  window.location.href = '/api/auth/google';
}

// Sign out by clearing the server cookie
export async function signOut(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}
