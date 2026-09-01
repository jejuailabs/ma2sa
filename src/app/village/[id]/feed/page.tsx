'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/common/Header';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { CategoryTabs, type CategoryTab } from '@/components/common/CategoryTabs';
import { FeedCard } from '@/components/feed/FeedCard';
import { PostComposer } from '@/components/feed/PostComposer';
import { AccessGuard } from '@/components/auth/AccessGuard';
import { usePosts } from '@/hooks/usePosts';
import { getVillage } from '@/lib/firebase/firestore';

export default function VillageFeedPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [activeTab, setActiveTab] = useState<CategoryTab>('news');
  const [villageName, setVillageName] = useState('내 마을');
  const { posts, loading, error, reload } = usePosts({ villageId: id, type: activeTab });

  useEffect(() => { void getVillage(id).then((village) => village && setVillageName(village.name)); }, [id]);

  return (
    <AccessGuard villageId={id}>
      <div className="min-h-screen pb-20 md:pb-0">
        <Header />
        <main className="max-w-content mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Link href={`/village/${id}`} className="p-2 rounded-lg hover:bg-[var(--color-surface)]"><ArrowLeft className="w-5 h-5" /></Link>
            <div><h1 className="text-xl font-bold">마을 소식</h1><p className="text-xs text-[var(--color-text-secondary)]">{villageName}</p></div>
          </div>
          <div className="mb-6"><CategoryTabs active={activeTab} onChange={setActiveTab} /></div>
          <PostComposer villageId={id} villageName={villageName} onCreated={reload} />
          <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
            {loading ? <p className="col-span-2 text-center py-12 text-[var(--color-text-secondary)]">소식을 불러오는 중입니다...</p>
              : error ? <p className="col-span-2 text-center py-12 text-error">{error}</p>
              : posts.length === 0 ? <p className="col-span-2 text-center py-12 text-[var(--color-text-secondary)]">첫 소식을 작성해보세요.</p>
              : posts.map((post) => <FeedCard key={post.id} post={post} />)}
          </div>
        </main>
        <BottomTabBar />
      </div>
    </AccessGuard>
  );
}
