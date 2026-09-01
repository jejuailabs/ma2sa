import {
  collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs,
  limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { User, UserRole } from '@/types/user';
import type { Village } from '@/types/village';

function asDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof (v as Timestamp).toDate === 'function') return (v as Timestamp).toDate();
  return new Date();
}

export interface SiteConfig {
  siteName: string;
  logoText: string;
  bannerImageURL: string;
  bannerTitle: string;
  bannerSubtitle: string;
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: '마을AI사무장',
  logoText: '마을AI사무장',
  bannerImageURL: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400',
  bannerTitle: '마을의 이야기가\n여행이 되는 곳',
  bannerSubtitle: '전국의 아름다운 마을 소식과 특별한 이야기를\n한곳에서 만나보세요.',
};

export interface AILog {
  id: string;
  userId: string;
  userEmail: string;
  villageId: string;
  villageName: string;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  createdAt: Date;
}

export interface AdminStats {
  totalUsers: number;
  totalVillages: number;
  totalPosts: number;
  totalAIUsage: number;
}

// ─── Site Config ───

export async function getSiteConfig(): Promise<SiteConfig> {
  if (!db) return DEFAULT_SITE_CONFIG;
  try {
    const snap = await getDoc(doc(db, 'config', 'site'));
    if (!snap.exists()) return DEFAULT_SITE_CONFIG;
    return { ...DEFAULT_SITE_CONFIG, ...snap.data() } as SiteConfig;
  } catch {
    return DEFAULT_SITE_CONFIG;
  }
}

export async function updateSiteConfig(data: Partial<SiteConfig>): Promise<void> {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  await setDoc(doc(db, 'config', 'site'), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── Admin Stats ───

export async function getAdminStats(): Promise<AdminStats> {
  if (!db) return { totalUsers: 0, totalVillages: 0, totalPosts: 0, totalAIUsage: 0 };
  const [users, villages, aiLogs] = await Promise.all([
    getCountFromServer(collection(db, 'users')),
    getCountFromServer(collection(db, 'villages')),
    getCountFromServer(collection(db, 'aiLogs')).catch(() => ({ data: () => ({ count: 0 }) })),
  ]);
  return {
    totalUsers: users.data().count,
    totalVillages: villages.data().count,
    totalPosts: 0,
    totalAIUsage: aiLogs.data().count,
  };
}

// ─── Village Management ───

export async function getAllVillages(): Promise<(Village & { id: string })[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'villages'), orderBy('createdAt', 'desc'), limit(100)));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: asDate(d.data().createdAt) }) as Village & { id: string });
}

export async function deleteVillageAdmin(villageId: string): Promise<void> {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  await deleteDoc(doc(db, 'villages', villageId));
}

// ─── User Management ───

export async function getAllUsers(): Promise<User[]> {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200)));
  return snap.docs.map((d) => ({ ...d.data(), uid: d.id, createdAt: asDate(d.data().createdAt), lastLoginAt: asDate(d.data().lastLoginAt) }) as User);
}

export async function updateUserRoleAdmin(uid: string, role: UserRole): Promise<void> {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  await updateDoc(doc(db, 'users', uid), { role });
}

export async function toggleSiteAdmin(uid: string, isAdmin: boolean): Promise<void> {
  if (!db) throw new Error('Firebase가 설정되지 않았습니다.');
  await updateDoc(doc(db, 'users', uid), { isSiteAdmin: isAdmin });
}

// ─── AI Logs ───

export async function getAILogs(maxCount = 50): Promise<AILog[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, 'aiLogs'), orderBy('createdAt', 'desc'), limit(maxCount)));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: asDate(d.data().createdAt) }) as AILog);
  } catch {
    return [];
  }
}

export async function getAIUsageSummary(): Promise<{ totalTokens: number; totalCost: number; byFeature: Record<string, number> }> {
  if (!db) return { totalTokens: 0, totalCost: 0, byFeature: {} };
  try {
    const snap = await getDocs(query(collection(db, 'aiLogs'), orderBy('createdAt', 'desc'), limit(500)));
    let totalTokens = 0;
    let totalCost = 0;
    const byFeature: Record<string, number> = {};
    snap.docs.forEach((d) => {
      const data = d.data();
      totalTokens += Number(data.totalTokens ?? 0);
      totalCost += Number(data.cost ?? 0);
      const feat = String(data.feature ?? 'unknown');
      byFeature[feat] = (byFeature[feat] ?? 0) + Number(data.totalTokens ?? 0);
    });
    return { totalTokens, totalCost, byFeature };
  } catch {
    return { totalTokens: 0, totalCost: 0, byFeature: {} };
  }
}

export async function logAIUsage(data: Omit<AILog, 'id' | 'createdAt'>): Promise<void> {
  if (!db) return;
  const { addDoc: addDocFn } = await import('firebase/firestore');
  await addDocFn(collection(db, 'aiLogs'), { ...data, createdAt: serverTimestamp() });
}
