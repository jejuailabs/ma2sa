'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileSearch, Receipt, FileText, Mic, Volume2, FolderOpen, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AISubNavProps {
  villageId: string;
}

const AI_TABS = [
  { icon: FileSearch, label: '공고문 분석', path: '/ai/announcement', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30' },
  { icon: Receipt, label: '영수증→엑셀', path: '/ai/receipt', color: 'bg-green-500', light: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30' },
  { icon: FileText, label: '양식 변환', path: '/ai/format', color: 'bg-purple-500', light: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30' },
  { icon: Mic, label: '회의록 정리', path: '/ai/transcribe', color: 'bg-orange-500', light: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30' },
  { icon: Volume2, label: '대신 읽어주기', path: '/ai/narration', color: 'bg-pink-500', light: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-500/30' },
  { icon: FolderOpen, label: 'AI 업무 목록', path: '/docs', color: 'bg-gray-500', light: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30' },
];

export function AISubNav({ villageId }: AISubNavProps) {
  const pathname = usePathname();
  const basePath = `/village/${villageId}`;
  const currentTab = AI_TABS.find((t) => pathname === basePath + t.path);

  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
        <Link href={basePath} className="hover:text-primary font-medium">대시보드</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`${basePath}/ai`} className="hover:text-primary font-medium">AI 업무</Link>
        {currentTab && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[var(--color-text)] font-bold">{currentTab.label}</span>
          </>
        )}
      </div>

      <div className="px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {AI_TABS.map((tab) => {
          const href = basePath + tab.path;
          const isActive = pathname === href;
          return (
            <Link
              key={tab.path}
              href={href}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap border-2 transition-all shrink-0',
                isActive
                  ? `${tab.color} text-white border-transparent shadow-md scale-105`
                  : `${tab.light} hover:scale-105 hover:shadow-sm`
              )}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
