'use client';

import {
  BookOpenText,
  CalendarDays,
  FileArchive,
  Home,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/auth-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

type ActiveSection = 'dashboard' | 'ai' | 'docs';

export function WorkModeShell({
  villageId,
  active,
  children,
}: {
  villageId: string;
  active: ActiveSection;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { profile, logout } = useAuth();
  const adminItems = [
    { label: '대시보드', icon: Home, href: '/dashboard', key: 'dashboard' },
    { label: 'AI 기능', icon: Sparkles, href: `/village/${villageId}/ai`, key: 'ai' },
    { label: '문서함', icon: FileArchive, href: `/village/${villageId}/docs`, key: 'docs' },
  ];
  const futureItems = [
    { label: '마을 소식', icon: BookOpenText },
    { label: '마을 주민', icon: Users },
    { label: '일정 관리', icon: CalendarDays },
    { label: '자금 관리', icon: WalletCards },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-[#173f32] p-4 text-white lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-3 px-2 py-2">
          <span className="grid size-10 place-items-center rounded-xl bg-white/12"><Home className="size-5" /></span>
          <div><p className="font-bold tracking-[-0.03em]">마을AI사무장</p><p className="text-[11px] text-white/55">업무모드</p></div>
        </Link>
        <nav className="space-y-1" aria-label="업무 메뉴">
          {adminItems.map((item) => {
            const Icon = item.icon;
            const selected = active === item.key;
            return <Link key={item.key} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${selected ? 'bg-white text-[#173f32]' : 'text-white/68 hover:bg-white/10 hover:text-white'}`}><Icon className="size-[18px]" />{item.label}</Link>;
          })}
          {futureItems.map((item) => {
            const Icon = item.icon;
            return <span key={item.label} className="flex cursor-default items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/38"><Icon className="size-[18px]" />{item.label}</span>;
          })}
        </nav>
        <div className="mt-6 border-t border-white/10 pt-4">
          <span className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/45"><Settings className="size-[18px]" />설정</span>
        </div>
        <div className="mt-auto flex items-center gap-3 rounded-2xl bg-white/8 p-3">
          <Avatar><AvatarFallback className="bg-[#d9e9df] text-xs font-bold text-[#173f32]">{profile?.displayName?.slice(0, 1) || '마'}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{profile?.displayName || '마을 관리자'}</p><p className="text-[11px] text-white/48">{profile?.role === 'leader' ? '이장' : '사무장'}</p></div>
          <button type="button" aria-label="로그아웃" onClick={() => logout().then(() => router.replace('/'))}><LogOut className="size-4 text-white/50" /></button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b bg-background/92 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-7 lg:px-9">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="메뉴"><Menu /></Button>
            <Link href="/dashboard" className="hidden text-sm font-semibold text-muted-foreground hover:text-foreground sm:block">업무 대시보드</Link>
            <Link href="/" className="ml-auto text-sm text-muted-foreground hover:text-foreground">주민 화면</Link>
            <Avatar className="ml-2"><AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{profile?.displayName?.slice(0, 1) || '마'}</AvatarFallback></Avatar>
          </div>
        </header>
        <main className="mx-auto max-w-[1380px] px-4 pb-24 pt-6 sm:px-7 lg:px-9 lg:pb-12">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-background/95 px-3 pb-[max(9px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="모바일 업무 메뉴">
        {adminItems.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;
          return <Link key={item.key} href={item.href} className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${selected ? 'text-primary' : 'text-muted-foreground'}`}><Icon className="size-5" />{item.label}</Link>;
        })}
      </nav>
    </div>
  );
}
