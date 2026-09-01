'use client';

import Link from 'next/link';
import { ArrowRight, FileSearch, Receipt, FileText, Mic, Volume2, FolderOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface AIFeatureItem {
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
}

const AI_FEATURES: AIFeatureItem[] = [
  { icon: FileSearch, label: '공고문 분석', description: '공고문 핵심 내용 추출', href: 'announcement' },
  { icon: Receipt, label: '영수증→엑셀', description: '영수증 자동 변환', href: 'receipt' },
  { icon: FileText, label: '텍스트→양식', description: '공식 양식으로 변환', href: 'format' },
  { icon: Mic, label: '회의록 정리', description: '녹음 자동 정리', href: 'transcribe' },
  { icon: Volume2, label: '대신 읽어주기', description: 'AI 나레이션 생성', href: 'narration' },
  { icon: FolderOpen, label: '문서함', description: '문서 통합 관리', href: '../docs' },
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
        className="flex items-center justify-between p-5 rounded-card bg-[var(--color-bg)] border border-[var(--color-border)] hover:shadow-md transition-shadow group"
      >
        <div>
          <h3 className="font-semibold text-[var(--color-text)]">AI 기능</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">바로가기</p>
        </div>
        <ArrowRight className="w-5 h-5 text-[var(--color-text-secondary)] group-hover:text-primary transition-colors" />
      </Link>
    );
  }

  return (
    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--color-text)]">AI 기능</h3>
        <Link href={`/village/${villageId}/ai`} className="text-sm text-primary hover:underline">
          전체보기
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {AI_FEATURES.map((feature) => (
          <Link
            key={feature.label}
            href={`/village/${villageId}/ai/${feature.href}`}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[var(--color-surface)] transition-colors text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center">
              <feature.icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-[var(--color-text)] leading-tight">{feature.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
