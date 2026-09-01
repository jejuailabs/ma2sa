'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isOfficialRole } from '@/types/user';

export function AccessGuard({ villageId, adminOnly = false, children }: { villageId: string; adminOnly?: boolean; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role ? isOfficialRole(user.role) : false;
  const allowed = Boolean(user && user.villageId === villageId && (!adminOnly || isAdmin));

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading) return <div className="min-h-[50vh] grid place-items-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  if (!user) return null;
  if (!allowed) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <div className="max-w-md text-center">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-error" />
          <h1 className="text-xl font-bold mb-2">접근 권한이 없습니다</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">소속 마을과 역할을 확인해주세요.</p>
          <button onClick={() => router.push(user.villageId ? `/village/${user.villageId}/feed` : '/village/setup')} className="mt-5 px-4 py-2 rounded-button bg-primary text-white">내 마을로 이동</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
