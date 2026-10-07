'use client';

import { FileArchive, FileSpreadsheet, FileText, LoaderCircle, Mic2, ReceiptText, Sparkles, Volume2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { WorkModeShell } from '@/components/work-mode-shell';
import { aiToolDefinitions, AiToolSlug } from '@/lib/ai/tools';

const cards: Array<{ slug: AiToolSlug | 'documents'; icon: typeof FileText; color: string }> = [
  { slug: 'announcement', icon: FileText, color: 'bg-emerald-50 text-emerald-700' },
  { slug: 'receipt', icon: ReceiptText, color: 'bg-orange-50 text-orange-700' },
  { slug: 'format', icon: FileSpreadsheet, color: 'bg-blue-50 text-blue-700' },
  { slug: 'transcribe', icon: Mic2, color: 'bg-purple-50 text-purple-700' },
  { slug: 'narration', icon: Volume2, color: 'bg-rose-50 text-rose-700' },
  { slug: 'documents', icon: FileArchive, color: 'bg-slate-100 text-slate-700' },
];

export default function AiHubPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (profile?.villageId !== params.id || (profile.role !== 'leader' && profile.role !== 'secretary')) router.replace('/');
  }, [loading, user, profile, params.id, router]);

  if (loading || !user || !profile || profile.villageId !== params.id || (profile.role !== 'leader' && profile.role !== 'secretary')) {
    return <main className="grid min-h-screen place-items-center"><LoaderCircle className="size-7 animate-spin text-primary" /></main>;
  }

  return (
    <WorkModeShell villageId={params.id} active="ai">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-primary"><Sparkles className="size-4" /> AI WORK TOOLS</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">AI 업무 도구</h1>
          <p className="mt-3 text-sm text-muted-foreground">반복되는 마을 행정 업무를 파일 하나와 짧은 메모로 처리하세요.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ slug, icon: Icon, color }) => {
            const isDocuments = slug === 'documents';
            const definition = isDocuments ? null : aiToolDefinitions[slug];
            return (
              <Link key={slug} href={isDocuments ? `/village/${params.id}/docs` : `/village/${params.id}/ai/${slug}`}>
                <Card className="h-full border-0 shadow-sm ring-border transition-all hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="p-6">
                    <span className={`mb-5 grid size-12 place-items-center rounded-2xl ${color}`}><Icon className="size-5.5" /></span>
                    <h2 className="text-lg font-bold">{isDocuments ? '마을 문서함' : definition?.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{isDocuments ? 'AI가 만든 공고문 분석, 장부, 회의록과 방송 원고를 한곳에서 찾습니다.' : definition?.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </WorkModeShell>
  );
}
