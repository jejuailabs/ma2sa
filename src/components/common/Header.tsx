'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X, Bell, Home, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from './ThemeToggle';
import { Avatar } from './Avatar';
import { isOfficialRole } from '@/types/user';
import { getSiteConfig } from '@/lib/firebase/admin';
import type { CategoryTab } from './CategoryTabs';

interface HeaderProps {
  activeTab?: CategoryTab;
  onTabChange?: (tab: CategoryTab) => void;
  showTabs?: boolean;
}

const CATEGORY_TABS: { key: CategoryTab; label: string }[] = [
  { key: 'news', label: '마을 소식' },
  { key: 'event', label: '이벤트' },
  { key: 'product', label: '마을 특산품' },
];

export function Header({ activeTab, onTabChange, showTabs = false }: HeaderProps) {
  const { user, login, logout, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoText, setLogoText] = useState('마을AI사무장');

  useEffect(() => {
    getSiteConfig().then((c) => setLogoText(c.logoText)).catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-bg)] border-b border-[var(--color-border)] transition-colors duration-300">
      {/* PC Header */}
      <div className="hidden md:flex items-center justify-between max-w-content mx-auto px-6 h-14">
        <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg shrink-0">
          <Home className="w-5 h-5" />
          <span>{logoText}</span>
        </Link>

        {showTabs && (
          <nav className="flex items-center gap-1 ml-8">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <ThemeToggle />
          <button className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
            <Bell className="w-5 h-5" />
          </button>
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button onClick={() => setProfileMenuOpen(!profileMenuOpen)} className="flex items-center gap-2">
                <Avatar src={user.photoURL} name={user.displayName} size={32} />
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-[var(--color-border)]">
                    <p className="text-sm font-medium text-[var(--color-text)]">{user.displayName}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{user.email}</p>
                  </div>
                  <Link href="/mypage" className="block px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)]" onClick={() => setProfileMenuOpen(false)}>
                    마이페이지
                  </Link>
                  {isOfficialRole(user.role) && user.villageId && (
                    <Link href={`/village/${user.villageId}`} className="block px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface)]" onClick={() => setProfileMenuOpen(false)}>
                      업무모드
                    </Link>
                  )}
                  {user.isSiteAdmin && (
                    <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-[var(--color-surface)]" onClick={() => setProfileMenuOpen(false)}>
                      <Shield className="w-3.5 h-3.5" /> 관리자
                    </Link>
                  )}
                  <button onClick={() => { logout(); setProfileMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-error hover:bg-[var(--color-surface)]">
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={login} className="px-4 py-1.5 text-sm font-medium text-white bg-primary rounded-full hover:opacity-90 transition-opacity">
              로그인
            </button>
          )}
        </div>
      </div>

      {/* Mobile Header */}
      <div className="flex md:hidden items-center justify-between px-4 h-12">
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 text-[var(--color-text)]">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Link href="/" className="font-semibold text-sm text-[var(--color-text)]">{logoText}</Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <button onClick={() => setProfileMenuOpen(!profileMenuOpen)} className="p-1">
              <Avatar src={user.photoURL} name={user.displayName} size={28} />
            </button>
          ) : (
            <button onClick={login} className="px-3 py-1 text-xs font-medium text-white bg-primary rounded-full">로그인</button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 space-y-1">
          {showTabs && CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { onTabChange?.(tab.key); setMobileMenuOpen(false); }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm ${
                activeTab === tab.key ? 'bg-primary-light text-primary font-medium' : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {user?.isSiteAdmin && (
            <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-primary font-medium" onClick={() => setMobileMenuOpen(false)}>
              <Shield className="w-4 h-4" /> 관리자
            </Link>
          )}
          {user && (
            <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="block w-full text-left px-3 py-2 text-sm text-error">
              로그아웃
            </button>
          )}
        </div>
      )}
    </header>
  );
}
