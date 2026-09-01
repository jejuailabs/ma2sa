'use client';

import {
  Bell,
  CalendarDays,
  ChevronRight,
  FileText,
  Heart,
  Home,
  Menu,
  MessageCircle,
  Moon,
  Search,
  Share2,
  ShoppingBasket,
  Sparkles,
  Sun,
  UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type FeedType = 'news' | 'event' | 'product';

const tabs: { id: FeedType; label: string; icon: typeof Home }[] = [
  { id: 'news', label: '마을 소식', icon: Home },
  { id: 'event', label: '이벤트', icon: CalendarDays },
  { id: 'product', label: '마을 특산품', icon: ShoppingBasket },
];

const posts = [
  {
    id: 1,
    type: 'news' as FeedType,
    village: '남해 다랭이마을',
    initials: '남해',
    time: '12분 전',
    title: '가을 바다와 논길이 가장 예쁜 날입니다',
    body: '오늘 마을 공동정비를 마치고 주민들과 해안 산책로를 둘러봤어요. 이번 주말 방문객을 위한 작은 안내소도 문을 엽니다.',
    image:
      'https://images.unsplash.com/photo-1697983586877-1ae4e3656f6b?auto=format&fit=crop&q=82&w=1600',
    imageAlt: '남해의 푸른 바다와 초록빛 산자락이 어우러진 풍경',
    likes: 86,
    comments: 14,
  },
  {
    id: 2,
    type: 'event' as FeedType,
    village: '거제 어구리마을',
    initials: '거제',
    time: '1시간 전',
    title: '이번 토요일, 어촌 체험 한마당',
    body: '오전 10시 마을회관 앞에서 시작합니다. 장화와 여벌 옷을 준비해 주세요.',
    image:
      'https://images.unsplash.com/photo-1757827170995-58bf717ef293?auto=format&fit=crop&q=82&w=1600',
    imageAlt: '거제의 잔잔한 바다와 정박한 배가 보이는 어촌 풍경',
    likes: 42,
    comments: 8,
  },
  {
    id: 3,
    type: 'product' as FeedType,
    village: '금성리 마을회',
    initials: '금성',
    time: '어제',
    title: '올해 첫 수확한 햅쌀 예약을 시작합니다',
    body: '마을 공동 논에서 정성껏 키운 햅쌀입니다. 주민 공동판매 수익은 경로당 난방비로 사용됩니다.',
    image:
      'https://images.unsplash.com/photo-1536633125620-8a3245c11ffa?auto=format&fit=crop&q=82&w=1600',
    imageAlt: '햇빛 아래 황금빛으로 익은 벼가 펼쳐진 논',
    likes: 127,
    comments: 23,
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<FeedType>('news');
  const [query, setQuery] = useState('');
  const [liked, setLiked] = useState<number[]>([]);
  const [dark, setDark] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matching = posts.filter((post) => post.type === activeTab);
    if (!normalized) return matching;
    return matching.filter((post) =>
      `${post.village} ${post.title} ${post.body}`.toLowerCase().includes(normalized),
    );
  }, [activeTab, query]);

  function toggleLike(id: number) {
    setLiked((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-foreground transition-colors">
        <header className="sticky top-0 z-40 border-b bg-background/92 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-10">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="메뉴 열기">
              <Menu />
            </Button>
            <a href="#main" className="mr-auto flex items-center gap-2.5" aria-label="마을AI사무장 홈">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Home className="size-[18px]" strokeWidth={2.4} />
              </span>
              <span className="text-[17px] font-bold tracking-[-0.04em]">마을AI사무장</span>
            </a>

            <nav className="hidden items-center gap-1 lg:flex" aria-label="주요 메뉴">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  className={activeTab === tab.id ? 'bg-accent text-primary' : 'text-muted-foreground'}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </Button>
              ))}
            </nav>

            <Button
              variant="ghost"
              size="icon"
              aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
              onClick={() => setDark((value) => !value)}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="알림">
              <Bell />
            </Button>
            <Button
              className="rounded-full px-4"
              onClick={() => setNotice('로그인 연결 준비가 완료되었습니다. 다음 단계에서 Google 인증을 연결합니다.')}
            >
              로그인
            </Button>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-14">
          <section className="bg-hero mb-6 grid gap-4 overflow-hidden rounded-[28px] p-6 text-white shadow-[0_18px_50px_rgba(33,92,69,0.18)] sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end lg:p-10">
            <div className="max-w-2xl">
              <Badge className="mb-4 bg-white/16 text-white ring-1 ring-white/25">우리 마을의 오늘</Badge>
              <h1 className="text-balance text-3xl font-bold leading-tight tracking-[-0.05em] sm:text-4xl">
                가까운 소식부터 중요한 일까지,
                <br className="hidden sm:block" /> 한곳에서 함께 나눠요.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/78 sm:text-base">
                전국 마을의 이야기와 행사, 정성껏 기른 특산품을 만나보세요.
              </p>
            </div>
            <Button
              variant="secondary"
              className="h-11 w-fit rounded-full bg-white px-5 text-[#19543e] hover:bg-white/90"
              onClick={() => setNotice('로그인하면 우리 마을 소식을 직접 작성할 수 있어요.')}
            >
              우리 마을 시작하기 <ChevronRight />
            </Button>
          </section>

          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
            <aside className="hidden lg:block" aria-label="소식 카테고리">
              <div className="sticky top-24 space-y-5">
                <Card className="border-0 shadow-sm ring-border">
                  <CardContent className="space-y-2 p-3">
                    <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      둘러보기
                    </p>
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors ${
                            activeTab === tab.id
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          <Icon className="size-4.5" /> {tab.label}
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
                <div className="px-2 text-xs leading-5 text-muted-foreground">
                  공개 소식은 로그인 없이 볼 수 있습니다.
                </div>
              </div>
            </aside>

            <section aria-labelledby="feed-title" className="min-w-0">
              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="마을이나 소식을 검색하세요"
                    aria-label="마을 소식 검색"
                    className="h-11 rounded-xl bg-card pl-10 shadow-sm"
                  />
                </div>
              </div>

              <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="소식 카테고리 탭">
                {tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'default' : 'outline'}
                    className="h-10 rounded-full px-4"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary">LATEST FROM VILLAGES</p>
                  <h2 id="feed-title" className="mt-1 text-2xl font-bold tracking-[-0.04em]">
                    {tabs.find((tab) => tab.id === activeTab)?.label}
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground">최신순</span>
              </div>

              <div className="space-y-5">
                {filteredPosts.map((post) => {
                  const isLiked = liked.includes(post.id);
                  return (
                    <article key={post.id}>
                      <Card className="gap-0 overflow-hidden rounded-[24px] border-0 py-0 shadow-[0_8px_32px_rgba(25,71,52,0.08)] ring-border transition-transform duration-300 hover:-translate-y-0.5">
                        <CardContent className="p-5 sm:p-6">
                          <div className="mb-4 flex items-center gap-3">
                            <Avatar size="lg" className="bg-[#e8f1ec]">
                              <AvatarFallback className="bg-[#e8f1ec] text-[11px] font-bold text-primary">
                                {post.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{post.village}</p>
                              <p className="text-xs text-muted-foreground">{post.time}</p>
                            </div>
                            <Badge variant="secondary" className="ml-auto">
                              {tabs.find((tab) => tab.id === post.type)?.label}
                            </Badge>
                          </div>
                          <h3 className="text-xl font-bold leading-snug tracking-[-0.03em] sm:text-[22px]">{post.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-[15px]">{post.body}</p>
                        </CardContent>
                        <img src={post.image} alt={post.imageAlt} className="aspect-[16/9] w-full object-cover" />
                        <div className="flex items-center gap-1 border-t px-3 py-2 sm:px-5">
                          <Button
                            variant="ghost"
                            className={isLiked ? 'text-rose-500' : 'text-muted-foreground'}
                            aria-pressed={isLiked}
                            onClick={() => toggleLike(post.id)}
                          >
                            <Heart className={isLiked ? 'fill-current' : ''} /> {post.likes + (isLiked ? 1 : 0)}
                          </Button>
                          <Button variant="ghost" className="text-muted-foreground" onClick={() => setNotice('댓글 기능은 로그인 후 이용할 수 있습니다.')}>
                            <MessageCircle /> {post.comments}
                          </Button>
                          <Button variant="ghost" className="ml-auto text-muted-foreground" onClick={() => setNotice('공유 링크를 준비했습니다.')}>
                            <Share2 /> 공유
                          </Button>
                        </div>
                      </Card>
                    </article>
                  );
                })}
                {filteredPosts.length === 0 && (
                  <Card className="items-center rounded-[24px] border-dashed py-12 text-center shadow-none">
                    <Search className="mb-3 size-8 text-muted-foreground" />
                    <p className="font-semibold">검색 결과가 없습니다</p>
                    <p className="mt-1 text-sm text-muted-foreground">다른 마을 이름이나 단어로 찾아보세요.</p>
                  </Card>
                )}
              </div>
            </section>

            <aside className="hidden xl:block" aria-label="AI 업무 도구 안내">
              <div className="sticky top-24 space-y-4">
                <Card className="border-0 bg-[#173f32] text-white shadow-lg ring-0">
                  <CardContent className="p-5">
                    <span className="mb-4 grid size-10 place-items-center rounded-xl bg-white/12">
                      <Sparkles className="size-5" />
                    </span>
                    <h2 className="text-lg font-bold">이장·사무장 업무모드</h2>
                    <p className="mt-2 text-sm leading-6 text-white/68">
                      공고문 분석부터 회의록 정리까지, 반복 업무를 AI가 도와드려요.
                    </p>
                    <Button
                      variant="secondary"
                      className="mt-5 h-10 w-full rounded-xl bg-white text-[#173f32] hover:bg-white/90"
                      onClick={() => {
                        window.location.href = '/dashboard';
                      }}
                    >
                      업무모드 살펴보기 <ChevronRight />
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm ring-border">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center gap-3">
                      <FileText className="size-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold">오늘 등록된 문서</p>
                        <p className="text-xs text-muted-foreground">전국 마을 기준</p>
                      </div>
                      <strong className="ml-auto text-xl">28</strong>
                    </div>
                    <div className="h-px bg-border" />
                    <p className="text-xs leading-5 text-muted-foreground">
                      마을의 개인정보와 문서는 해당 마을 구성원만 확인할 수 있습니다.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </aside>
          </div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/94 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="하단 메뉴">
          <div className="mx-auto grid max-w-md grid-cols-4">
            {[
              { label: '홈', icon: Home, active: true },
              { label: '문서함', icon: FileText, active: false },
              { label: '검색', icon: Search, active: false },
              { label: '마이', icon: UserRound, active: false },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${item.active ? 'text-primary' : 'text-muted-foreground'}`}
                  onClick={() => !item.active && setNotice(`${item.label} 화면은 다음 구현 단계에서 연결됩니다.`)}
                >
                  <Icon className="size-5" /> {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {notice && (
          <div role="status" className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,460px)] -translate-x-1/2 rounded-2xl bg-[#173f32] px-4 py-3 text-sm text-white shadow-2xl lg:bottom-8">
            <div className="flex items-center gap-3">
              <Sparkles className="size-4 shrink-0 text-[#f4ca65]" />
              <span className="flex-1">{notice}</span>
              <button type="button" className="text-xs text-white/70 hover:text-white" onClick={() => setNotice(null)}>
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
