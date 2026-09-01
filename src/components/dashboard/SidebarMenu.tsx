'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3, Bot, ClipboardList, Globe, Home, Newspaper, Settings, Users, Wallet, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarMenuProps {
  villageId: string;
  villageName?: string;
  balance?: number;
}

const MAIN_MENU = [
  { icon: BarChart3, label: '대시보드', path: '' },
  { icon: Newspaper, label: '마을 소식', path: '/feed' },
  { icon: Users, label: '마을 주민', path: '/members' },
  { icon: Calendar, label: '일정 관리', path: '/schedule' },
  { icon: ClipboardList, label: 'AI 업무 목록', path: '/docs' },
  { icon: Wallet, label: '자금 관리', path: '/finance' },
  { icon: Bot, label: 'AI 업무', path: '/ai' },
];

const MANAGE_MENU = [
  { icon: Settings, label: '설정', path: '/settings' },
];

export function SidebarMenu({ villageId, villageName = '내 마을' }: SidebarMenuProps) {
  const pathname = usePathname();
  const basePath = `/village/${villageId}`;

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0 bg-sidebar text-sidebar-text">
      {/* Logo - links to main */}
      <Link href="/" className="block px-5 pt-6 pb-5 hover:opacity-80 transition-opacity">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5" />
          <span className="font-bold text-base">마을AI사무장</span>
        </div>
        <p className="text-xs text-sidebar-text/60 mt-1">{villageName} 업무모드</p>
      </Link>

      {/* Main menu */}
      <nav className="flex-1 px-3">
        {MAIN_MENU.map((item) => {
          const href = basePath + item.path;
          const isActive = item.path === '' ? pathname === basePath : pathname.startsWith(href);
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-sidebar-text/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-6 mb-2 px-3">
          <p className="text-[10px] uppercase tracking-wider text-sidebar-text/40 font-medium">관리</p>
        </div>
        {MANAGE_MENU.map((item) => {
          const href = basePath + item.path;
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-sidebar-text/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}

        {/* 메인 화면 바로가기 */}
        <div className="mt-4 px-3">
          <Link href="/" className="flex items-center gap-2 text-xs text-sidebar-text/50 hover:text-sidebar-text/80 transition-colors">
            <Globe className="w-3.5 h-3.5" />
            메인 화면으로
          </Link>
        </div>
      </nav>
    </aside>
  );
}
