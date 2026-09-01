'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Receipt, Mic, Volume2, FileSearch, FolderOpen, Search, Loader2, Trash2 } from 'lucide-react';
import { AccessGuard } from '@/components/auth/AccessGuard';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';

interface VillageDoc {
  id: string;
  title: string;
  type: 'announcement' | 'receipt' | 'format' | 'transcribe' | 'narration' | 'other';
  content: string;
  fileURL?: string;
  createdAt: Date;
}

const TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string; color: string; bg: string }> = {
  announcement: { icon: FileSearch, label: '공고문 분석', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  receipt: { icon: Receipt, label: '영수증', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
  format: { icon: FileText, label: '양식 변환', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  transcribe: { icon: Mic, label: '회의록', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  narration: { icon: Volume2, label: '나레이션', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-500/10' },
  other: { icon: FolderOpen, label: '기타', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-500/10' },
};

export default function DocsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [docs, setDocs] = useState<VillageDoc[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VillageDoc | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) { setLoading(false); return; }
    const q = query(collection(db, 'villages', id, 'documents'), orderBy('createdAt', 'desc'));
    getDocs(q)
      .then((snap) => {
        setDocs(snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title ?? '제목 없음',
            type: data.type ?? 'other',
            content: data.content ?? '',
            fileURL: data.fileURL,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
          };
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async (docId: string) => {
    if (!db || !confirm('이 문서를 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'villages', id, 'documents', docId));
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      if (selected?.id === docId) setSelected(null);
    } catch {}
  };

  const filtered = docs
    .filter((d) => filter === 'all' || d.type === filter)
    .filter((d) => !searchText || d.title.includes(searchText) || d.content.includes(searchText));

  return (
    <AccessGuard villageId={id} adminOnly>
      <div className="min-h-screen pb-20 md:pb-0 bg-[var(--color-bg)]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href={`/village/${id}`} className="p-2 rounded-lg hover:bg-[var(--color-surface)]">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-500/10 flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-gray-600" />
              </div>
              <h1 className="text-xl font-bold">마을 문서함</h1>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[{ value: 'all', label: '전체' }, ...Object.entries(TYPE_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))].map((f) => (
              <button key={f.value} onClick={() => setFilter(f.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f.value ? 'bg-primary text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-primary'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="문서 검색..." className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-primary" />
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen className="w-12 h-12 text-[var(--color-text-secondary)] mx-auto mb-3" />
              <p className="text-[var(--color-text-secondary)] mb-2">
                {docs.length === 0 ? '아직 저장된 문서가 없습니다' : '검색 결과가 없습니다'}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">AI 기능을 사용하면 결과가 여기에 자동 저장됩니다</p>
              <Link href={`/village/${id}/ai`} className="inline-block mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm">AI 기능 바로가기</Link>
            </div>
          ) : (
            <div className="flex gap-4">
              {/* Document List */}
              <div className={`${selected ? 'hidden sm:block sm:w-1/3' : 'w-full'} space-y-2`}>
                {filtered.map((d) => {
                  const cfg = TYPE_CONFIG[d.type] || TYPE_CONFIG.other;
                  const Icon = cfg.icon;
                  return (
                    <button key={d.id} onClick={() => setSelected(d)} className={`w-full text-left p-4 rounded-xl border transition-colors ${selected?.id === d.id ? 'border-primary bg-primary-light' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-primary/50'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{d.title}</p>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{cfg.label} · {d.createdAt.toLocaleDateString('ko-KR')}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Document Detail */}
              {selected && (
                <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold">{selected.title}</h3>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                        {TYPE_CONFIG[selected.type]?.label} · {selected.createdAt.toLocaleString('ko-KR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(selected.id)} className="p-2 rounded-lg text-error hover:bg-error/10" title="삭제">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setSelected(null)} className="sm:hidden p-2 rounded-lg hover:bg-[var(--color-bg)] text-sm">닫기</button>
                    </div>
                  </div>
                  <div className="bg-[var(--color-bg)] rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-auto">
                    {selected.content || '(내용 없음)'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <BottomTabBar />
    </AccessGuard>
  );
}
