'use client';

import Link from 'next/link';
import { Header } from '@/components/common/Header';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { FileSearch, Receipt, FileText, Mic, Volume2, FolderOpen, ArrowLeft } from 'lucide-react';

const AI_FEATURES = [
  { icon: FileSearch, label: '공고문 분석', description: '공고문 이미지/PDF를 업로드하면 AI가 핵심 내용을 추출·요약합니다', href: 'announcement', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { icon: Receipt, label: '영수증→엑셀', description: '영수증 이미지를 업로드하면 자동으로 엑셀로 변환됩니다', href: 'receipt', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
  { icon: FileText, label: '텍스트→양식 변환', description: '텍스트를 입력하면 정해진 공식 양식으로 자동 변환됩니다', href: 'format', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  { icon: Mic, label: '회의록 자동 정리', description: '녹음 파일을 업로드하면 AI가 회의록을 자동 정리합니다', href: 'transcribe', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  { icon: Volume2, label: '대신 읽어주기', description: '마을 방송용 텍스트를 AI 나레이션 음성으로 생성합니다', href: 'narration', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10' },
  { icon: FolderOpen, label: '마을 문서함', description: 'AI로 생성된 모든 문서를 통합 관리합니다', href: '../docs', color: 'text-secondary', bg: 'bg-secondary-light' },
];

export default function AIHubPage({ params }: { params: { id: string } }) {
  const { id } = params;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/village/${id}`} className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--color-text)]" />
          </Link>
          <h1 className="text-xl font-bold text-[var(--color-text)]">AI 기능</h1>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AI_FEATURES.map((feature) => (
            <Link
              key={feature.label}
              href={`/village/${id}/ai/${feature.href}`}
              className="flex flex-col p-6 rounded-card border border-[var(--color-border)] bg-[var(--color-bg)] hover:shadow-md hover:scale-[1.02] transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-[var(--color-text)] mb-2">{feature.label}</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{feature.description}</p>
            </Link>
          ))}
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
}
