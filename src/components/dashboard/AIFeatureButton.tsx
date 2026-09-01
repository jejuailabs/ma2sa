'use client';

import Link from 'next/link';
import { FileSearch, Receipt, FileText, Mic, Volume2, FolderOpen, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AIFeatureItem {
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
  color: string;
  bg: string;
}

const AI_FEATURES: AIFeatureItem[] = [
  { icon: FileSearch, label: '공고문 분석', description: '지원사업 핵심만 추출', href: 'announcement', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { icon: Receipt, label: '영수증 → 엑셀', description: '사진으로 장부 정리', href: 'receipt', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  { icon: FileText, label: '문서 양식 변환', description: '초안을 공문서로 변환', href: 'format', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-500/10' },
  { icon: Mic, label: '회의록 자동 정리', description: '녹음에서 결정사항 추출', href: 'transcribe', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  { icon: Volume2, label: '대신 읽어주기', description: '방송용 음성 만들기', href: 'narration', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
  { icon: FolderOpen, label: 'AI 업무 목록', description: '작업 이력 한눈에 보기', href: '../docs', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-500/10' },
];

interface AIFeatureButtonProps {
  villageId: string;
  compact?: boolean;
}

export function AIFeatureButton({ villageId, compact = false }: AIFeatureButtonProps) {
  if (compact) {
    return (
      <Link
        href={`/village/${villageId}/ai`}
        className="flex items-center justify-between p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:shadow-sm transition-shadow"
      >
        <span className="text-sm font-medium">AI 기능</span>
        <span className="text-xs text-primary">바로가기 &rsaquo;</span>
      </Link>
    );
  }

  return (
    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">AI WORK TOOLS</p>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg text-[var(--color-text)]">AI 업무 바로가기</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {AI_FEATURES.map((f) => (
          <Link
            key={f.label}
            href={`/village/${villageId}/ai/${f.href}`}
            className="flex flex-col p-4 rounded-xl border border-[var(--color-border)] hover:shadow-sm hover:border-primary/30 transition-all group"
          >
            <div className={`w-8 h-8 rounded-lg ${f.bg} flex items-center justify-center mb-3`}>
              <f.icon className={`w-4 h-4 ${f.color}`} />
            </div>
            <span className="text-sm font-semibold text-[var(--color-text)] mb-0.5">{f.label}</span>
            <span className="text-xs text-[var(--color-text-secondary)]">{f.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
