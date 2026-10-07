'use client';

import {
  Bell,
  BookOpenText,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Home,
  Image as ImageIcon,
  LogOut,
  LoaderCircle,
  Menu,
  Mic2,
  Moon,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Sparkles,
  Sun,
  Users,
  Volume2,
  WalletCards,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress, ProgressLabel } from '@/components/ui/progress';

const menuItems = [
  { label: '대시보드', icon: Home, active: true },
  { label: '마을 소식', icon: BookOpenText },
  { label: '마을 주민', icon: Users },
  { label: '일정 관리', icon: CalendarDays },
  { label: '문서함', icon: FileArchive, path: 'docs' },
  { label: '자금 관리', icon: WalletCards },
];

const stats = [
  { label: '마을 소식', value: '12', meta: '이번 달 +3', icon: BookOpenText, tone: 'bg-emerald-50 text-emerald-700' },
  { label: '예정 행사', value: '3', meta: '가장 가까운 일정 D-4', icon: CalendarDays, tone: 'bg-amber-50 text-amber-700' },
  { label: '마을 주민', value: '84', meta: '가입 승인 2건', icon: Users, tone: 'bg-sky-50 text-sky-700' },
  { label: '이번 달 지출', value: '1,250,000원', meta: '예산의 42%', icon: WalletCards, tone: 'bg-violet-50 text-violet-700' },
];

const aiTools = [
  { label: '공고문 분석', slug: 'announcement', description: '지원사업 핵심만 추출', icon: FileText, color: 'text-emerald-700 bg-emerald-50' },
  { label: '영수증 → 엑셀', slug: 'receipt', description: '사진으로 장부 정리', icon: ReceiptText, color: 'text-orange-700 bg-orange-50' },
  { label: '문서 양식 변환', slug: 'format', description: '초안을 공문서로 변환', icon: FileSpreadsheet, color: 'text-blue-700 bg-blue-50' },
  { label: '회의록 자동 정리', slug: 'transcribe', description: '녹음에서 결정사항 추출', icon: Mic2, color: 'text-purple-700 bg-purple-50' },
  { label: '대신 읽어주기', slug: 'narration', description: '방송용 음성 만들기', icon: Volume2, color: 'text-rose-700 bg-rose-50' },
  { label: '마을 문서함', slug: 'docs', description: '생성 문서 한곳에 보관', icon: FileArchive, color: 'text-slate-700 bg-slate-100' },
];

const initialTasks = [
  { id: 1, title: '가을 축제 참가 신청서 제출', due: '오늘', urgent: true, done: false },
  { id: 2, title: '경로당 난방비 영수증 정리', due: '오늘', urgent: false, done: false },
  { id: 3, title: '주민회의 공지 방송', due: '오후 6시', urgent: false, done: true },
  { id: 4, title: '마을회관 안전 점검 일정 확인', due: '9월 4일', urgent: false, done: false },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading, logout } = useAuth();
  const [tasks, setTasks] = useState(initialTasks);
  const [dark, setDark] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const completed = tasks.filter((task) => task.done).length;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!profile?.villageId) {
      router.replace('/village/setup');
      return;
    }
    if (profile.role !== 'leader' && profile.role !== 'secretary') router.replace('/');
  }, [loading, user, profile, router]);

  function toggleTask(id: number) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  if (loading || !user || !profile?.villageId || (profile.role !== 'leader' && profile.role !== 'secretary')) {
    return <main className="grid min-h-screen place-items-center bg-background"><LoaderCircle className="size-7 animate-spin text-primary" /></main>;
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-foreground transition-colors lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="hidden min-h-screen flex-col border-r bg-[#173f32] p-4 text-white lg:flex">
          <Link href="/" className="mb-8 flex items-center gap-3 px-2 py-2">
            <span className="grid size-10 place-items-center rounded-xl bg-white/12"><Home className="size-5" /></span>
            <div>
              <p className="font-bold tracking-[-0.03em]">마을AI사무장</p>
              <p className="text-[11px] text-white/55">업무모드</p>
            </div>
          </Link>
          <nav className="space-y-1" aria-label="업무 메뉴">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => !item.active && (item.path ? router.push(`/village/${profile.villageId}/${item.path}`) : setToast(`${item.label} 메뉴는 다음 구현 단계에서 연결됩니다.`))}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${item.active ? 'bg-white text-[#173f32]' : 'text-white/68 hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon className="size-[18px]" /> {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-7 border-t border-white/10 pt-5">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">관리</p>
            <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/65 hover:bg-white/10 hover:text-white" onClick={() => setToast('설정 화면을 준비하고 있습니다.')}>
              <Settings className="size-[18px]" /> 설정
            </button>
          </div>
          <div className="mt-auto flex items-center gap-3 rounded-2xl bg-white/8 p-3">
            <Avatar><AvatarFallback className="bg-[#d9e9df] text-xs font-bold text-[#173f32]">김</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{profile.displayName}</p>
              <p className="text-[11px] text-white/48">{profile.role === 'leader' ? '이장' : '사무장'}</p>
            </div>
            <button type="button" aria-label="로그아웃" onClick={() => logout().then(() => router.replace('/'))}><LogOut className="size-4 text-white/50" /></button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b bg-background/92 backdrop-blur-xl">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-7 lg:px-9">
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="메뉴 열기"><Menu /></Button>
              <Link href="/" className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground sm:flex"><ChevronLeft className="size-4" /> 주민 화면</Link>
              <div className="ml-auto flex items-center gap-1">
                <Button variant="ghost" size="icon" aria-label={dark ? '라이트 모드' : '다크 모드'} onClick={() => setDark((value) => !value)}>{dark ? <Sun /> : <Moon />}</Button>
                <Button variant="ghost" size="icon" aria-label="검색"><Search /></Button>
                <Button variant="ghost" size="icon" aria-label="알림" className="relative"><Bell /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500" /></Button>
                <Avatar className="ml-2"><AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">김</AvatarFallback></Avatar>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[1380px] px-4 pb-24 pt-6 sm:px-7 lg:px-9 lg:pb-12">
            <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge variant="secondary" className="mb-3">금성리 마을 · 맑음 24°C</Badge>
                <h1 className="text-3xl font-bold tracking-[-0.05em] sm:text-4xl">{profile.displayName}님, 좋은 아침이에요.</h1>
                <p className="mt-2 text-sm text-muted-foreground">오늘 처리할 일 3건과 새 가입 요청 2건이 있습니다.</p>
              </div>
              <Button className="h-11 w-fit rounded-full px-5" onClick={() => setToast('새 소식 작성 화면을 준비했습니다.')}><Plus /> 새 소식 작성</Button>
            </section>

            <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="마을 현황 요약">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label} className="border-0 shadow-sm ring-border">
                    <CardContent className="p-5">
                      <div className="mb-5 flex items-center justify-between">
                        <span className={`grid size-10 place-items-center rounded-xl ${stat.tone}`}><Icon className="size-5" /></span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="mt-1 text-2xl font-bold tracking-[-0.04em]">{stat.value}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{stat.meta}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <section className="space-y-6">
                <Card className="border-0 shadow-sm ring-border">
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-primary">AI WORK TOOLS</p>
                      <CardTitle className="mt-1 text-xl font-bold">AI 업무 바로가기</CardTitle>
                    </div>
                    <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Bot className="size-5" /></span>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {aiTools.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <button
                          key={tool.label}
                          type="button"
                          onClick={() => router.push(tool.slug === 'docs' ? `/village/${profile.villageId}/docs` : `/village/${profile.villageId}/ai/${tool.slug}`)}
                          className="group rounded-2xl border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
                        >
                          <span className={`mb-4 grid size-10 place-items-center rounded-xl ${tool.color}`}><Icon className="size-5" /></span>
                          <span className="block font-semibold">{tool.label}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{tool.description}</span>
                          <span className="mt-4 flex items-center text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">시작하기 <ChevronRight className="size-3.5" /></span>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm ring-border">
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-xl font-bold">최근 마을 소식</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setToast('전체 마을 소식으로 이동합니다.')}>전체보기 <ChevronRight /></Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      ['가을 마을축제 자원봉사자를 모집합니다', '행사', '오늘 09:20'],
                      ['회관 앞 도로 공사 일정 안내', '공지', '어제 16:42'],
                      ['공동 작업장 사용 신청을 받습니다', '마을 소식', '8월 30일'],
                    ].map(([title, category, date]) => (
                      <button key={title} type="button" className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-accent" onClick={() => setToast(title)}>
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><BookOpenText className="size-4.5" /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{category} · {date}</span></span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </section>

              <aside className="space-y-6">
                <Card className="border-0 shadow-sm ring-border">
                  <CardHeader className="flex-row items-center justify-between">
                    <div><CardTitle className="text-xl font-bold">오늘 할 일</CardTitle><p className="mt-1 text-xs text-muted-foreground">{completed}/{tasks.length} 완료</p></div>
                    <Button variant="outline" size="icon-sm" aria-label="할 일 추가" onClick={() => setToast('할 일 추가 입력창을 준비했습니다.')}><Plus /></Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tasks.map((task) => (
                      <button key={task.id} type="button" onClick={() => toggleTask(task.id)} className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-accent">
                        <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${task.done ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>
                          {task.done && <ClipboardCheck className="size-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-medium ${task.done ? 'text-muted-foreground line-through' : ''}`}>{task.title}</span>
                          <span className={`mt-1 block text-xs ${task.urgent ? 'font-semibold text-rose-500' : 'text-muted-foreground'}`}>{task.due}</span>
                        </span>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm ring-border">
                  <CardHeader><CardTitle className="text-xl font-bold">이번 달 예산</CardTitle></CardHeader>
                  <CardContent>
                    <Progress value={42} className="gap-2">
                      <ProgressLabel>사용 금액</ProgressLabel>
                      <span className="ml-auto text-sm tabular-nums text-muted-foreground">1,250,000원</span>
                    </Progress>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">총 예산</p><p className="mt-1 font-bold">3,000,000원</p></div>
                      <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">남은 금액</p><p className="mt-1 font-bold text-primary">1,750,000원</p></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm ring-border">
                  <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-xl font-bold">최근 사진</CardTitle><ImageIcon className="size-4 text-muted-foreground" /></CardHeader>
                  <CardContent className="grid grid-cols-3 gap-2">
                    {[
                      'https://images.unsplash.com/photo-1697983586877-1ae4e3656f6b?auto=format&fit=crop&q=75&w=400',
                      'https://images.unsplash.com/photo-1757827170995-58bf717ef293?auto=format&fit=crop&q=75&w=400',
                      'https://images.unsplash.com/photo-1536633125620-8a3245c11ffa?auto=format&fit=crop&q=75&w=400',
                    ].map((src, index) => <img key={src} src={src} alt={`최근 마을 활동 사진 ${index + 1}`} className="aspect-square rounded-xl object-cover" />)}
                  </CardContent>
                </Card>
              </aside>
            </div>
          </main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-background/95 px-3 pb-[max(9px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden" aria-label="모바일 업무 메뉴">
          {[
            ['홈', Home], ['할 일', ClipboardCheck], ['AI 기능', Sparkles], ['더보기', Menu],
          ].map(([label, Icon], index) => {
            const NavIcon = Icon as typeof Home;
            return <button key={label as string} type="button" onClick={() => index === 2 ? router.push(`/village/${profile.villageId}/ai`) : index !== 0 && setToast(`${label} 메뉴를 선택했습니다.`)} className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${index === 0 ? 'text-primary' : 'text-muted-foreground'}`}><NavIcon className="size-5" />{label as string}</button>;
          })}
        </nav>

        {toast && (
          <div role="status" className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,460px)] -translate-x-1/2 rounded-2xl bg-[#173f32] px-4 py-3 text-sm text-white shadow-2xl lg:bottom-8">
            <div className="flex items-center gap-3"><Sparkles className="size-4 shrink-0 text-[#f4ca65]" /><span className="flex-1">{toast}</span><button type="button" className="text-xs text-white/70" onClick={() => setToast(null)}>닫기</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
