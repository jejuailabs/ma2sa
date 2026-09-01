export type UserRole = 'resident' | 'leader' | 'secretary';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  villageId: string | null;
  role: UserRole;
  createdAt: Date;
  lastLoginAt: Date;
  settings: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
  };
}
