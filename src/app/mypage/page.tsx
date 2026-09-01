'use client';

import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/Header';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { Avatar } from '@/components/common/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { ChevronRight, Moon, Sun, Bell, LogOut, MapPin, Shield } from 'lucide-react';

export default function MyPage() {
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const roleLabel = user?.role === 'leader' ? '이장' : user?.role === 'secretary' ? '사무장' : '주민';

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Profile */}
        <div className="flex flex-col items-center mb-8">
          <Avatar src={user?.photoURL} name={user?.displayName ?? '게스트'} size={80} className="mb-3" />
          <h2 className="text-xl font-bold text-[var(--color-text)]">
            {user?.displayName ?? '로그인이 필요합니다'}
          </h2>
          {user && (
            <>
              <p className="text-sm text-[var(--color-text-secondary)]">{user.email}</p>
              <span className="mt-2 px-3 py-1 rounded-full text-xs font-medium bg-secondary-light text-secondary">
                {roleLabel}
              </span>
            </>
          )}
        </div>

        {/* Menu */}
        <div className="space-y-2">
          {user?.villageId && (
            <button
              onClick={() => router.push(`/village/${user.villageId}`)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
            >
              <MapPin className="w-5 h-5 text-secondary" />
              <span className="flex-1 text-left text-sm font-medium text-[var(--color-text)]">내 마을</span>
              <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
          )}

          {(user?.role === 'leader' || user?.role === 'secretary') && user?.villageId && (
            <button
              onClick={() => router.push(`/village/${user.villageId}`)}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-secondary-light dark:bg-secondary/10 border border-secondary/20 hover:bg-secondary/20 transition-colors"
            >
              <Shield className="w-5 h-5 text-secondary" />
              <span className="flex-1 text-left text-sm font-medium text-secondary">업무모드 전환</span>
              <ChevronRight className="w-5 h-5 text-secondary" />
            </button>
          )}

          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-[var(--color-text-secondary)]" /> : <Sun className="w-5 h-5 text-[var(--color-text-secondary)]" />}
            <span className="flex-1 text-sm font-medium text-[var(--color-text)]">다크 모드</span>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-[var(--color-border)]'}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors">
            <Bell className="w-5 h-5 text-[var(--color-text-secondary)]" />
            <span className="flex-1 text-left text-sm font-medium text-[var(--color-text)]">알림 설정</span>
            <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>

          {user && (
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-[var(--color-bg)] border border-error/20 hover:bg-error/5 transition-colors"
            >
              <LogOut className="w-5 h-5 text-error" />
              <span className="flex-1 text-left text-sm font-medium text-error">로그아웃</span>
            </button>
          )}
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
}
