'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Menu, X, BarChart3, Calendar, FolderOpen, Home, Newspaper, Settings, Users, Wallet,
} from 'lucide-react';

interface MobileDashboardHeaderProps {
  villageId: string;
  villageName: string;
}

const MENU_ITEMS = [
  { icon: BarChart3, label: '대시보드', path: '' },
  { icon: Newspaper, label: '마을 소식', path: '/feed' },
  { icon: Users, label: '마을 주민', path: '/members' },
  { icon: Calendar, label: '일정 관리', path: '/schedule' },
  { icon: FolderOpen, label: 'AI 업무 목록', path: '/docs' },
  { icon: Wallet, label: '자금 관리', path: '/finance' },
  { icon: Settings, label: '설정', path: '/settings' },
];

export function MobileDashboardHeader({ villageId, villageName }: MobileDashboardHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 h-12 bg-sidebar text-sidebar-text">
        <button onClick={() => setOpen(true)} className="p-1.5">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm">{villageName}</span>
        <Link href="/" className="text-xs text-sidebar-text/70">주민 화면</Link>
      </header>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar text-sidebar-text z-50 shadow-xl animate-slideIn">
            <div className="flex items-center justify-between px-5 h-12">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                <span className="font-bold text-sm">마을AI사무장</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="px-5 text-xs text-sidebar-text/60 mb-3">{villageName} 업무모드</p>
            <nav className="px-3 space-y-0.5">
              {MENU_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={`/village/${villageId}${item.path}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-text/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <item.icon className="w-4 h-4" />
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
