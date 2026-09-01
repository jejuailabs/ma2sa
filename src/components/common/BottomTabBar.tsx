'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const TABS = [
  { icon: Home, label: '홈', href: '/' },
  { icon: FileText, label: '문서함', href: '/village/docs' },
  { icon: Search, label: '검색', href: '/search' },
  { icon: User, label: '마이', href: '/mypage' },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const getHref = (tab: typeof TABS[0]) => {
    if (tab.href === '/village/docs' && user?.villageId) {
      return `/village/${user.villageId}/docs`;
    }
    return tab.href;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--color-bg)] border-t border-[var(--color-border)] pb-safe">
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const href = getHref(tab);
          const isActive = pathname === href || (tab.href === '/' && pathname === '/');
          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-3 transition-colors',
                isActive ? 'text-primary' : 'text-[var(--color-text-secondary)]'
              )}
            >
              <tab.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
