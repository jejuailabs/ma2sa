'use client';

import { useState } from 'react';
import { Header } from '@/components/common/Header';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { SearchBar } from '@/components/common/SearchBar';
import { FeedCard } from '@/components/feed/FeedCard';
import { Search, Loader2 } from 'lucide-react';
import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { collectionGroup, query as fbQuery, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Post } from '@/types/feed';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Post[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const doSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    if (!isFirebaseConfigured || !db) return;
    setLoading(true);
    setSearched(true);
    try {
      const snap = await getDocs(fbQuery(collectionGroup(db, 'posts'), orderBy('createdAt', 'desc'), limit(50)));
      const all = snap.docs.map((d) => {
        const data = d.data();
        return { ...data, id: d.id, createdAt: data.createdAt?.toDate?.() ?? new Date() } as Post;
      });
      const lower = q.toLowerCase();
      setResults(all.filter((p) =>
        p.title?.toLowerCase().includes(lower) ||
        p.content?.toLowerCase().includes(lower) ||
        p.villageName?.includes(q)
      ));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-bold text-[var(--color-text)] mb-4">검색</h1>
        <SearchBar placeholder="마을 소식, 이벤트, 특산품 검색" value={searchQuery} onChange={doSearch} />

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : searchQuery.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
              <Search className="w-12 h-12 mb-4 opacity-30" />
              <p>검색어를 입력해주세요</p>
              <p className="text-sm mt-1">2글자 이상 입력하면 검색됩니다</p>
            </div>
          ) : searched && results.length === 0 ? (
            <div className="text-center py-20 text-[var(--color-text-secondary)]">
              <p className="text-lg mb-2">&ldquo;{searchQuery}&rdquo; 검색 결과가 없습니다</p>
              <p className="text-sm">다른 검색어로 시도해보세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-secondary)]">{results.length}건의 결과</p>
              {results.map((post) => (
                <FeedCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
}
