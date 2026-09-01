'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileSearch, Receipt, FileText, Mic, Volume2, FolderOpen, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AISubNavProps {
  villageId: string;
}

const AI_TABS = [
  { icon: FileSearch, label: '공고문 분석', path: '/ai/announcement', color: 'text-blue-500' },
  { icon: Receipt, label: '영수증→엑셀', path: '/ai/receipt', color: 'text-green-500' },
  { icon: FileText, label: '양식 변환', path: '/ai/format', color: 'text-purple-500' },
  { icon: Mic, label: '회의록 정리', path: '/ai/transcribe', color: 'text-orange-500' },
  { icon: Volume2, label: '대신 읽어주기', path: '/ai/narration', color: 'text-pink-500' },
  { icon: FolderOpen, label: '문서함', path: '/docs', color: 'text-gray-500' },
];

export function AISubNav({ villageId }: AISubNavProps) {
  const pathname = usePathname();
  const basePath = `/village/${villageId}`;
  const currentTab = AI_TABS.find((t) => pathname === basePath + t.path);

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 pt-3 pb-1 flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
        <Link href={basePath} className="hover:text-primary">대시보드</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`${basePath}/ai`} className="hover:text-primary">AI 업무</Link>
        {currentTab && (
          <>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[var(--color-text)] font-medium">{currentTab.label}</span>
          </>
        )}
      </div>

      {/* Tab bar */}
      <div className="px-4 sm:px-6 flex gap-1 overflow-x-auto scrollbar-hide">
        {AI_TABS.map((tab) => {
          const href = basePath + tab.path;
          const isActive = pathname === href;
          return (
            <Link
              key={tab.path}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'
              )}
            >
              <tab.icon className={cn('w-3.5 h-3.5', isActive ? 'text-primary' : tab.color)} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
