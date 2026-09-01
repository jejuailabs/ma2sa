'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthChange, getUserProfile, signInWithGoogle, signOut } from '@/lib/firebase/auth';
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
    const fbUser = await signInWithGoogle();
    const profile = await getUserProfile(fbUser.uid);
    setUser(profile);
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
