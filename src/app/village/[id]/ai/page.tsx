'use client';

import Link from 'next/link';
import { FileSearch, Receipt, FileText, Mic, Volume2, FolderOpen } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const AI_FEATURES = [
  { icon: FileSearch, label: '공고문 분석', description: '공고문 이미지/PDF를 업로드하면 AI가 핵심 내용을 추출·요약합니다', href: 'announcement', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { icon: Receipt, label: '영수증→엑셀', description: '영수증 이미지를 업로드하면 자동으로 엑셀로 변환됩니다', href: 'receipt', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
  { icon: FileText, label: '텍스트→양식 변환', description: '텍스트를 입력하면 정해진 공식 양식으로 자동 변환됩니다', href: 'format', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  { icon: Mic, label: '회의록 자동 정리', description: '녹음 파일을 업로드하면 AI가 회의록을 자동 정리합니다', href: 'transcribe', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  { icon: Volume2, label: '대신 읽어주기', description: '마을 방송용 텍스트를 AI 나레이션 음성으로 생성합니다', href: 'narration', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10' },
  { icon: FolderOpen, label: 'AI 업무 목록', description: 'AI 작업 이력과 결과물을 통합 관리합니다', href: '../docs', color: 'text-secondary', bg: 'bg-secondary-light' },
];

export default function AIHubPage({ params }: { params: { id: string } }) {
  const { id } = params;

  return (
    <DashboardShell villageId={id}>
      <div>
        <h1 className="text-xl font-bold mb-6">AI 업무 도구</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AI_FEATURES.map((feature) => (
            <Link
              key={feature.label}
              href={`/village/${id}/ai/${feature.href}`}
              className="flex flex-col p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:shadow-md hover:scale-[1.02] transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="font-semibold mb-2">{feature.label}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{feature.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
