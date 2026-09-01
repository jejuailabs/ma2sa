import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import type { User } from '@/types/user';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<FirebaseUser> {
  if (!auth) throw new Error('Firebase not initialized');
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  if (db) {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const newUser: Omit<User, 'createdAt' | 'lastLoginAt'> & { createdAt: unknown; lastLoginAt: unknown } = {
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        photoURL: user.photoURL ?? '',
        villageId: null,
        role: 'resident',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        settings: {
          theme: 'system',
          notifications: true,
        },
      };
      await setDoc(userRef, newUser);
    } else {
      await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    }
  }

  return user;
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function getUserProfile(uid: string): Promise<User | null> {
  if (!db) return null;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as User;
}
