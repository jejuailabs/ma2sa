'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (!user.villageId) {
        router.push('/village/setup');
      } else {
        router.push(`/village/${user.villageId}`);
      }
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Home className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">마을AI사무장</h1>
        </div>

        <p className="text-[var(--color-text-secondary)] mb-8">
          마을의 이야기가 여행이 되는 곳
          <br />
          AI로 이장·사무장 업무를 지원합니다
        </p>

        <button
          onClick={login}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text)] font-medium hover:shadow-md transition-shadow disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? '로그인 중...' : 'Google로 로그인'}
        </button>

        <p className="mt-6 text-xs text-[var(--color-text-secondary)]">
          로그인하면 이용약관 및 개인정보처리방침에 동의하게 됩니다
        </p>
      </div>
    </div>
  );
}
