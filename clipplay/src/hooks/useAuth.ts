'use client';

import { useState, useEffect, useCallback } from 'react';
import { SessionUser } from '@/lib/auth/google';

interface AuthState {
  user: SessionUser | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  // Fetch current user on mount
  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch('/api/auth/me');

      if (response.ok) {
        const data = await response.json();
        setState({ user: data.user, isLoading: false, error: null });
      } else if (response.status === 401) {
        setState({ user: null, isLoading: false, error: null });
      } else {
        throw new Error('Failed to fetch user');
      }
    } catch (error) {
      setState({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, []);

  const login = useCallback(() => {
    window.location.href = '/api/auth/login';
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setState({ user: null, isLoading: false, error: null });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Logout failed',
      }));
    }
  }, []);

  return {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: !!state.user,
    isAdmin: state.user?.isAdmin ?? false,
    error: state.error,
    login,
    logout,
    refresh: fetchUser,
  };
}
