'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import logger from '@/lib/logger';

import type { AuthUser, LocalUser } from '../types';
import { AuthContext } from './AuthProvider';

export function LocalProviderWrapper({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  const isAuthPage =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/auth/') ||
      window.location.pathname.startsWith('/handler/') ||
      window.location.pathname === '/login' ||
      window.location.pathname === '/signup');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeAuth = async () => {
      try {
        const response = await fetch('/api/auth/oss');
        if (response.ok) {
          const data = await response.json();
          tokenRef.current = data.token;
          setUser(data.user);
          logger.info('OSS auth initialized', { user: data.user });
        } else {
          // No valid session token - redirect to login if not already on auth page
          if (!isAuthPage) {
            window.location.href = '/auth/login';
            return;
          }
        }
      } catch (error) {
        logger.error('Error initializing OSS auth', error);
        if (!isAuthPage) {
          window.location.href = '/auth/login';
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [isAuthPage]);

  const getAccessToken = React.useCallback(async () => {
    if (typeof window === 'undefined') {
      return 'ssr-placeholder-token';
    }
    if (!tokenRef.current) {
      logger.warn('No OSS token available after initialization');
      return '';
    }
    return tokenRef.current;
  }, []);

  const redirectToLogin = React.useCallback(() => {
    window.location.href = '/auth/login';
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      logger.error('Error during logout', error);
    }
    setUser(null);
    tokenRef.current = null;
    window.location.href = '/auth/login';
  }, []);

  const contextValue = useMemo(() => ({
    user: user as AuthUser,
    isAuthenticated: !!user,
    loading,
    getAccessToken,
    redirectToLogin,
    logout,
    provider: 'local' as const,
  }), [user, loading, getAccessToken, redirectToLogin, logout]);

  // While checking auth on a protected page, show loading spinner instead of protected content
  if (loading && !isAuthPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // If unauthenticated on a protected page, redirect and render spinner
  if (!loading && !user && !isAuthPage) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
