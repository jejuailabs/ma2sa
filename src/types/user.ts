export type UserRole = 'member' | 'leader' | 'secretary' | 'women_leader' | 'youth_leader' | 'elder';

export const ROLE_LABELS: Record<UserRole, string> = {
  member: '일반 회원',
  leader: '이장',
  secretary: '사무장',
  women_leader: '부녀회장',
  youth_leader: '청년회장',
  elder: '노인회장',
};

export const OFFICIAL_ROLES: { value: UserRole; label: string }[] = [
  { value: 'leader', label: '이장' },
  { value: 'secretary', label: '사무장' },
  { value: 'women_leader', label: '부녀회장' },
  { value: 'youth_leader', label: '청년회장' },
  { value: 'elder', label: '노인회장' },
];

export function isOfficialRole(role: UserRole): boolean {
  return role !== 'member';
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  villageId: string | null;
  role: UserRole;
  isSiteAdmin?: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  settings: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
  };
}
