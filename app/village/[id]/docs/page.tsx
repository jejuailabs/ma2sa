'use client';

import { collection, deleteDoc, doc, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { Download, FileArchive, LoaderCircle, Search, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WorkModeShell } from '@/components/work-mode-shell';
import { db, storage } from '@/lib/firebase/client';

interface VillageDocument {
  id: string;
  type: string;
  title: string;
  description: string;
  fileURL: string;
  createdAt?: Timestamp;
}

const categories: Record<string, string> = { all: '전체', announcement: '공고문', receipt: '영수증', formatted: '양식 문서', minutes: '회의록', narration: '나레이션' };

export default function DocumentsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [documents, setDocuments] = useState<VillageDocument[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (profile?.villageId !== params.id || (profile.role !== 'leader' && profile.role !== 'secretary')) router.replace('/');
  }, [loading, user, profile, params.id, router]);

  useEffect(() => {
    if (!user || profile?.villageId !== params.id || (profile.role !== 'leader' && profile.role !== 'secretary')) return;
    return onSnapshot(
      query(collection(db, 'villages', params.id, 'documents'), orderBy('createdAt', 'desc')),
      (snapshot) => setDocuments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as VillageDocument))),
      (cause) => setError(cause.message),
    );
  }, [user, profile, params.id]);

  const filtered = useMemo(() => documents.filter((item) => (category === 'all' || item.type === category) && `${item.title} ${item.description}`.toLowerCase().includes(search.toLowerCase())), [documents, category, search]);

  async function remove(item: VillageDocument) {
    if (!window.confirm(`'${item.title}' 문서를 삭제할까요?`)) return;
    setError(null);
    try {
      if (item.fileURL) await deleteObject(ref(storage, item.fileURL));
      await deleteDoc(doc(db, 'villages', params.id, 'documents', item.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '문서를 삭제하지 못했습니다.');
    }
  }

  if (loading || !user || !profile || profile.villageId !== params.id || (profile.role !== 'leader' && profile.role !== 'secretary')) {
    return <main className="grid min-h-screen place-items-center"><LoaderCircle className="size-7 animate-spin text-primary" /></main>;
  }

  return (
    <WorkModeShell villageId={params.id} active="docs">
      <section className="mx-auto max-w-6xl">
        <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary">VILLAGE DOCUMENTS</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">마을 문서함</h1><p className="mt-3 text-sm text-muted-foreground">AI로 생성하고 저장한 문서를 검색하고 내려받을 수 있습니다.</p></div>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 pl-10" placeholder="문서 검색" /></div>
          <div className="flex gap-2 overflow-x-auto pb-1">{Object.entries(categories).map(([value, label]) => <Button key={value} variant={category === value ? 'default' : 'outline'} size="sm" onClick={() => setCategory(value)}>{label}</Button>)}</div>
        </div>
        {error && <p role="alert" className="mb-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {filtered.length === 0 ? <Card className="border-0 shadow-sm ring-border"><CardContent className="grid min-h-72 place-items-center text-center text-sm text-muted-foreground"><div><FileArchive className="mx-auto mb-3 size-10 opacity-30" />저장된 문서가 없습니다.</div></CardContent></Card> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((item) => <Card key={item.id} className="border-0 shadow-sm ring-border"><CardContent className="p-5"><div className="mb-4 flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><FileArchive className="size-5" /></span><span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold">{categories[item.type] || item.type}</span></div><h2 className="truncate font-bold">{item.title}</h2><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{item.description}</p><p className="mt-4 text-xs text-muted-foreground">{item.createdAt?.toDate().toLocaleString('ko-KR') || '방금 전'}</p><div className="mt-4 flex gap-2"><Button variant="outline" size="sm" className="flex-1" disabled={!item.fileURL} onClick={() => item.fileURL && window.open(item.fileURL, '_blank', 'noopener,noreferrer')}><Download /> 다운로드</Button><Button variant="ghost" size="icon-sm" aria-label="삭제" onClick={() => remove(item)}><Trash2 /></Button></div></CardContent></Card>)}</div>}
      </section>
    </WorkModeShell>
  );
}
