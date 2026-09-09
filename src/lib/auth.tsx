'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, extractErrorMessage } from './api';
import type { AdminUser } from './types';

const ACCESS_KEY = 'bama.admin.accessToken';
const REFRESH_KEY = 'bama.admin.refreshToken';
const ADMIN_KEY = 'bama.admin.profile';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  admin?: AdminUser;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function getStoredAdmin(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCESS_KEY, session.accessToken);
  window.localStorage.setItem(REFRESH_KEY, session.refreshToken);
  if (session.admin) {
    window.localStorage.setItem(ADMIN_KEY, JSON.stringify(session.admin));
  }
  window.dispatchEvent(new CustomEvent('bama:auth-change'));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(ADMIN_KEY);
  window.dispatchEvent(new CustomEvent('bama:auth-change'));
}

export async function loginRequest(email: string, password: string): Promise<AuthSession> {
  const { data } = await api.post<{ success: true; data: AuthSession }>('/auth/login', {
    email,
    password,
  });
  setSession(data.data);
  return data.data;
}

export async function logoutRequest(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
  } catch (err) {
    extractErrorMessage(err, 'Logout request failed');
  }
  clearAuthSession();
}

export function useAuth() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isReady, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const sync = () => {
      setAdmin(getStoredAdmin());
      setReady(true);
    };
    sync();
    window.addEventListener('bama:auth-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('bama:auth-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isAuthenticated = Boolean(getAccessToken() && admin);

  const signOut = async () => {
    await logoutRequest();
    router.push('/login');
  };

  return { admin, isAuthenticated, isReady, signOut };
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const [pathname, setPathname] = useState<string | null>(null);

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (pathname === '/login' || pathname === '/landing' || pathname?.startsWith('/landing/')) return;
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isReady, pathname, router]);

  if (!isReady) {
    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          color: 'var(--muted-foreground)',
          fontSize: 13,
        }}
      >
        Checking session…
      </div>
    );
  }

  if (pathname === '/login' || pathname === '/landing' || pathname?.startsWith('/landing/')) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          color: 'var(--muted-foreground)',
          fontSize: 13,
        }}
      >
        Redirecting to sign in…
      </div>
    );
  }

  return <>{children}</>;
}
