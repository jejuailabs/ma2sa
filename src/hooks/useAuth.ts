'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthChange, getUserProfile, signInWithGoogle, signOut, handleRedirectResult } from '@/lib/firebase/auth';
import type { User } from '@/types/user';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<User | null>;
}

export function useAuthProvider(): AuthState {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handleRedirectResult().catch(() => {});
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const profile = await getUserProfile(fbUser.uid);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async () => {
    try {
      const fbUser = await signInWithGoogle();
      setFirebaseUser(fbUser);
      const profile = await getUserProfile(fbUser.uid);
      setUser(profile);
    } catch (err) {
      if (err instanceof Error && err.message === 'redirect') return;
      console.error('Login failed:', err);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) return null;
    const profile = await getUserProfile(firebaseUser.uid);
    setUser(profile);
    return profile;
  }, [firebaseUser]);

  return { firebaseUser, user, loading, login, logout, refreshProfile };
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = AuthContext.Provider;

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
