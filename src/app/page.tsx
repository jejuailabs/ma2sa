'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Home as HomeIcon, Calendar, ShoppingBasket, Search, Sparkles } from 'lucide-react';
import { Header } from '@/components/common/Header';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { HeroSection } from '@/components/feed/HeroSection';
import { FeedCard } from '@/components/feed/FeedCard';
import { usePosts } from '@/hooks/usePosts';
import { useAuth } from '@/hooks/useAuth';
import type { CategoryTab } from '@/components/common/CategoryTabs';

const SIDEBAR_TABS: { key: CategoryTab; label: string; icon: typeof HomeIcon }[] = [
  { key: 'news', label: '마을 소식', icon: HomeIcon },
  { key: 'event', label: '이벤트', icon: Calendar },
  { key: 'product', label: '마을 특산품', icon: ShoppingBasket },
];

const TAB_TITLES: Record<CategoryTab, string> = {
  news: '마을 소식',
  event: '이벤트',
  product: '마을 특산품',
};

export default function HomePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<CategoryTab>('news');
  const [searchQuery, setSearchQuery] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { posts, loading } = usePosts({ type: activeTab });
  const q = searchQuery.trim().toLowerCase();
  const filtered = posts.filter((p) => !q || [p.title, p.content, p.villageName].some((v) => v.toLowerCase().includes(q)));

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header showTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="max-w-content mx-auto px-4 sm:px-6 py-6">
        <HeroSection />

        <div className="flex gap-6">
          {/* Left Sidebar - PC only */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-20">
              <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider px-3 mb-2">둘러보기</p>
              <nav className="space-y-0.5">
                {SIDEBAR_TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === key
                        ? 'bg-primary text-white'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </nav>
              <p className="text-xs text-[var(--color-text-secondary)] mt-6 px-3">공개 소식은 로그인 없이 볼 수 있습니다.</p>
            </div>
          </aside>

          {/* Center Feed */}
          <main className="flex-1 min-w-0">
            <div className="relative mb-5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="마을이나 소식을 검색하세요"
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-0.5">LATEST FROM VILLAGES</p>
                <h2 className="text-xl font-bold text-[var(--color-text)]">{TAB_TITLES[activeTab]}</h2>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">최신순</span>
            </div>

            <div className="flex gap-2 mb-4 md:hidden overflow-x-auto scrollbar-hide">
              {SIDEBAR_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                    activeTab === key
                      ? 'bg-primary text-white'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map((i) => (
                  <div key={i} className="bg-[var(--color-surface)] rounded-xl h-64 animate-pulse" />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="space-y-4">
                {filtered.map((post) => (
                  <FeedCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-lg font-medium text-[var(--color-text)] mb-2">아직 소식이 없습니다</p>
                <p className="text-sm text-[var(--color-text-secondary)]">마을에 가입하고 첫 소식을 작성해보세요</p>
              </div>
            )}
          </main>

          {/* Right Sidebar - PC only */}
          <aside className="hidden xl:block w-72 shrink-0">
            <div className="sticky top-20 space-y-4">
              {/* 업무모드 CTA */}
              <div className="bg-primary-dark rounded-xl p-6 text-white">
                <Sparkles className="w-8 h-8 mb-3 text-white/80" />
                <h3 className="font-bold text-lg mb-1">이장 · 사무장 업무모드</h3>
                <p className="text-sm text-white/70 mb-4">공고문 분석부터 회의록 정리까지, 반복 업무를 AI가 도와드려요.</p>
                {user?.villageId ? (
                  <Link
                    href={`/village/${user.villageId}`}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-white text-primary-dark text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
                  >
                    내 마을 대시보드 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    href="/village/setup"
                    className="inline-flex items-center gap-1 px-4 py-2 bg-white text-primary-dark text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
                  >
                    업무모드 살펴보기 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {/* 안내 */}
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-5">
                <p className="text-xs text-[var(--color-text-secondary)]">마을의 개인정보와 문서는 해당 마을 구성원만 확인할 수 있습니다.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* 로그인 유도 배너 - 비로그인 상태에서만 표시 */}
      {!user && !bannerDismissed && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-primary text-white px-4 py-2.5 flex items-center justify-center gap-2 text-sm">
          <Sparkles className="w-4 h-4" />
          <span>로그인하면 우리 마을 소식을 직접 작성할 수 있어요</span>
          <button onClick={() => setBannerDismissed(true)} className="ml-2 px-3 py-1 bg-white text-primary rounded-full text-xs font-medium">닫기</button>
        </div>
      )}

      <BottomTabBar />
    </div>
  );
}
