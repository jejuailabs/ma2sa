'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Bell, Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from './ThemeToggle';
import { Avatar } from './Avatar';
import { isOfficialRole } from '@/types/user';

const NAV_ITEMS = [
  { label: '마을 소식', href: '/#feed' },
  { label: '이벤트', href: '/#feed-events' },
  { label: '마을 특산품', href: '/#feed-products' },
  { label: '소개', href: '/#hero' },
  { label: '이용안내', href: '/#guide' },
];

export function Header() {
  const { user, login, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-bg)] border-b border-[var(--color-border)] transition-colors duration-300">
      {/* PC Header */}
      <div className="hidden md:flex items-center justify-between max-w-content mx-auto px-6 h-16">
        <Link href="/" className="flex items-center gap-2 text-primary font-bold text-xl">
          <Home className="w-6 h-6" />
          <span>마을AI사무장</span>
        </Link>

        <nav className="flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button onClick={() => setProfileMenuOpen(!profileMenuOpen)} className="flex items-center gap-2">
                <Avatar src={user.photoURL} name={user.displayName} size={32} />
                <span className="text-sm font-medium text-[var(--color-text)]">{user.displayName}</span>
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-card shadow-lg py-2">
                  <Link href="/mypage" className="block px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)]" onClick={() => setProfileMenuOpen(false)}>
                    마이페이지
                  </Link>
                  {isOfficialRole(user.role) && user.villageId && (
                    <Link href={`/village/${user.villageId}`} className="block px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)]" onClick={() => setProfileMenuOpen(false)}>
                      업무모드 전환
                    </Link>
                  )}
                  <button onClick={() => { logout(); setProfileMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-error hover:bg-[var(--color-surface)]">
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={login} className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light rounded-button transition-colors">
                로그인
              </button>
              <button onClick={login} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-button hover:opacity-90 transition-opacity">
                회원가입
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Header */}
      <div className="flex md:hidden items-center justify-between px-4 h-14">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-[var(--color-text)]">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <span className="font-semibold text-[var(--color-text)]">Home</span>
        <button className="p-2 text-[var(--color-text)]">
          <Bell className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4 space-y-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block py-2 text-sm text-[var(--color-text-secondary)]"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
            <ThemeToggle />
            {user ? (
              <button onClick={logout} className="text-sm text-error">로그아웃</button>
            ) : (
              <button onClick={login} className="text-sm text-primary font-medium">로그인</button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
