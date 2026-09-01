'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, BarChart3, Home, Newspaper, ShoppingBasket, Bot, FolderOpen, Wallet, BookOpen } from 'lucide-react';

interface MobileDashboardHeaderProps {
  villageId: string;
  villageName: string;
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

export function MobileDashboardHeader({ villageId, villageName }: MobileDashboardHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-14 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <button onClick={() => setOpen(true)} className="p-2 text-[var(--color-text)]">
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-semibold text-[var(--color-text)]">{villageName}</span>
        <span className="text-sm text-[var(--color-text-secondary)]">24°C</span>
      </header>

      {/* Mobile Drawer */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-[var(--color-bg)] z-50 shadow-xl animate-slideIn">
            <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍊</span>
                <span className="font-bold text-[var(--color-text)]">{villageName}</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 text-[var(--color-text)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="px-3 py-4 space-y-1">
              {MENU_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={`/village/${villageId}${item.path}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
