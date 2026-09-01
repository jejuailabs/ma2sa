'use client';

import { useState } from 'react';
import { Header } from '@/components/common/Header';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { SearchBar } from '@/components/common/SearchBar';
import { CategoryTabs, type CategoryTab } from '@/components/common/CategoryTabs';
import { Badge } from '@/components/common/Badge';
import { HeroSection } from '@/components/feed/HeroSection';
import { CategoryCards } from '@/components/feed/CategoryCards';
import { FeedCard } from '@/components/feed/FeedCard';
import { usePosts } from '@/hooks/usePosts';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<CategoryTab>('news');
  const [searchQuery, setSearchQuery] = useState('');

  const { posts, loading, error } = usePosts({ type: activeTab });
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPosts = posts.filter((post) => !normalizedQuery || [post.title, post.content, post.villageName].some((value) => value.toLowerCase().includes(normalizedQuery)));

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-6">
        {/* Hero (PC only) */}
        <HeroSection />

        {/* Category Cards (PC only) */}
        <CategoryCards />

        {/* Search (Mobile) */}
        <div className="md:hidden mb-4">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Category Tabs */}
        <div className="mb-6">
          <CategoryTabs active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Feed Title */}
        <div className="flex items-center gap-3 mb-4" id="feed">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">마을 소식</h2>
          <Badge>최신 소식</Badge>
        </div>

        {/* Feed */}
        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
          {loading ? (
            <div className="col-span-2 text-center py-16 text-[var(--color-text-secondary)]">소식을 불러오는 중입니다...</div>
          ) : error ? (
            <div className="col-span-2 text-center py-16 text-error">{error}</div>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <FeedCard key={post.id} post={post} />
            ))
          ) : (
            <div className="col-span-2 text-center py-16 text-[var(--color-text-secondary)]">
              <p className="text-lg mb-2">아직 소식이 없습니다</p>
              <p className="text-sm">마을 소식이 등록되면 이곳에 표시됩니다</p>
            </div>
          )}
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
}
