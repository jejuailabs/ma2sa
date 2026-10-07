'use client';

import {
  GoogleAuthProvider,
  User,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { auth, db } from '@/lib/firebase/client';

export type VillageRole = 'member' | 'resident' | 'leader' | 'secretary';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  villageId: string | null;
  role: VillageRole;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function profileFromUser(user: User): UserProfile {
  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '마을 주민',
    photoURL: user.photoURL ?? '',
    villageId: null,
    role: 'member',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(currentUser: User) {
    const snapshot = await getDoc(doc(db, 'users', currentUser.uid));
    const nextProfile = snapshot.exists()
      ? ({ ...profileFromUser(currentUser), ...snapshot.data() } as UserProfile)
      : profileFromUser(currentUser);
    setProfile(nextProfile);
    return nextProfile;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await loadProfile(currentUser);
        } catch {
          setProfile(profileFromUser(currentUser));
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signIn() {
    await setPersistence(auth, browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const userRef = doc(db, 'users', result.user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      await setDoc(userRef, {
        ...profileFromUser(result.user),
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        settings: { theme: 'system', notifications: true },
      });
    } else {
      await setDoc(
        userRef,
        {
          email: result.user.email ?? '',
          displayName: result.user.displayName ?? '마을 주민',
          photoURL: result.user.photoURL ?? '',
          lastLoginAt: serverTimestamp(),
        },
        { merge: true },
      );
    }

    setUser(result.user);
    return loadProfile(result.user);
  }

  async function logout() {
    await signOut(auth);
    setProfile(null);
  }

  async function refreshProfile() {
    if (!auth.currentUser) return null;
    return loadProfile(auth.currentUser);
  }

  const value = useMemo(
    () => ({ user, profile, loading, signIn, logout, refreshProfile }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
