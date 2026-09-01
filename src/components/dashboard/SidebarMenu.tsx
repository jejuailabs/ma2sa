'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Home, Newspaper, ShoppingBasket, Bot, FolderOpen, Wallet, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface SidebarMenuProps {
  villageId: string;
  villageName?: string;
  balance?: number;
}

const MENU_ITEMS = [
  { icon: BarChart3, label: '대시보드', path: '' },
  { icon: Home, label: '내 마을', path: '/info' },
  { icon: Newspaper, label: '마을 소식', path: '/feed' },
  { icon: ShoppingBasket, label: '마을 특산품', path: '/products' },
  { icon: Bot, label: 'AI 기능', path: '/ai' },
  { icon: FolderOpen, label: '문서함', path: '/docs' },
  { icon: Wallet, label: '자금 관리', path: '/finance' },
  { icon: BookOpen, label: '장부 열람', path: '/ledger' },
];

export function SidebarMenu({ villageId, villageName = '금성리 마을', balance = 1250000 }: SidebarMenuProps) {
  const pathname = usePathname();
  const basePath = `/village/${villageId}`;

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-[calc(100vh-64px)] sticky top-16 bg-[var(--color-bg)] border-r border-[var(--color-border)]">
      {/* Village name */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍊</span>
          <h2 className="font-bold text-lg text-[var(--color-text)]">{villageName}</h2>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 space-y-1">
        {MENU_ITEMS.map((item) => {
          const href = basePath + item.path;
          const isActive = item.path === '' ? pathname === basePath : pathname.startsWith(href);
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-secondary-light text-secondary dark:bg-secondary/10'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Balance */}
      <div className="px-5 py-5 border-t border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-secondary)] mb-1">자금현황</p>
        <p className="text-lg font-bold text-[var(--color-text)]">{formatCurrency(balance)}</p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">클라우드</p>
      </div>
    </aside>
  );
}
