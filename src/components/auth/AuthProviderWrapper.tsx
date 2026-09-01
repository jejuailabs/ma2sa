'use client';

import { ReactNode } from 'react';
import { useAuthProvider, AuthProvider } from '@/hooks/useAuth';

export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  const auth = useAuthProvider();
  return <AuthProvider value={auth}>{children}</AuthProvider>;
}
