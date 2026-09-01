'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronRight, FileText, Newspaper, PenSquare, Users, Wallet } from 'lucide-react';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { AccessGuard } from '@/components/auth/AccessGuard';
import { SidebarMenu } from '@/components/dashboard/SidebarMenu';
import { MobileDashboardHeader } from '@/components/dashboard/MobileDashboardHeader';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentNews } from '@/components/dashboard/RecentNews';
import { TodoList } from '@/components/dashboard/TodoList';
import { AIFeatureButton } from '@/components/dashboard/AIFeatureButton';
import { PhotoGrid } from '@/components/dashboard/PhotoGrid';
import { MiniCalendar } from '@/components/dashboard/MiniCalendar';
import { getDashboardData, getVillage } from '@/lib/firebase/firestore';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardStats, Post, VillageDocument } from '@/types/feed';

export default function DashboardPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = useAuth();
  const [villageName, setVillageName] = useState('내 마을');
  const [stats, setStats] = useState<DashboardStats>({ news: 0, events: 0, meetings: 0, members: 0, todos: 0, balance: 0 });
  const [posts, setPosts] = useState<Post[]>([]);
  const [documents, setDocuments] = useState<VillageDocument[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    void Promise.all([getVillage(id), getDashboardData(id)]).then(([village, dashboard]) => {
      if (village) setVillageName(village.name);
      setStats(dashboard.stats); setPosts(dashboard.posts); setDocuments(dashboard.documents);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : '대시보드를 불러오지 못했습니다.'));
  }, [id]);

  const statCards = [
    { icon: Newspaper, label: '마을 소식', value: stats.news, sub: `이번 달 +${Math.max(1, stats.news)}`, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-500/10' },
    { icon: Calendar, label: '예정 행사', value: stats.events, sub: '가장 가까운 일정 D-4', color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-500/10' },
    { icon: Users, label: '마을 주민', value: stats.members, sub: '가입 승인 2건', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-500/10' },
    { icon: Wallet, label: '이번 달 지출', value: formatCurrency(stats.balance), sub: '예산의 42%', color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-500/10' },
  ];
  const photos = documents.filter((item) => item.type === 'photo' && item.fileURL).map((item) => item.fileURL);

  return (
    <AccessGuard villageId={id} adminOnly>
      <div className="min-h-screen flex bg-[var(--color-surface)]">
        <SidebarMenu villageId={id} villageName={villageName} balance={stats.balance} />

        <div className="flex-1 flex flex-col min-h-screen">
          <MobileDashboardHeader villageId={id} villageName={villageName} />

          {/* Top bar - PC */}
          <div className="hidden lg:flex items-center justify-between px-8 py-3 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
            <Link href="/" className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-primary">
              &lsaquo; 주민 화면
            </Link>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90">
              <PenSquare className="w-4 h-4" />
              새 소식 작성
            </button>
          </div>

          <div className="flex-1 flex gap-6 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6 overflow-auto">
            {/* Main content */}
            <main className="flex-1 min-w-0 max-w-4xl">
              {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-error text-sm">{error}</div>}

              <DashboardGreeting userName={user?.displayName || '사용자'} userRole={user?.role || 'member'} villageName={villageName} />

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {statCards.map((stat) => <StatCard key={stat.label} {...stat} />)}
              </div>

              {/* AI Features */}
              <div className="mb-6">
                <AIFeatureButton villageId={id} />
              </div>

              {/* Recent News */}
              <RecentNews posts={posts} villageId={id} />
            </main>

            {/* Right sidebar */}
            <aside className="hidden xl:block w-72 shrink-0 space-y-4">
              <MiniCalendar villageId={id} />

              <TodoList initialTodos={[]} villageId={id} userId={user?.uid} />

              {/* Budget card */}
              <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-[var(--color-text)]">자금 현황</h3>
                  <Link href={`/village/${id}/finance`} className="text-xs text-primary">관리 &rsaquo;</Link>
                </div>
                <div className="bg-primary-light rounded-lg p-3 text-center">
                  <p className="text-[10px] text-primary">잔액</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(stats.balance)}</p>
                </div>
              </div>

              {photos.length > 0 && <PhotoGrid photos={photos} />}
            </aside>
          </div>
        </div>
      </div>
      <BottomTabBar />
    </AccessGuard>
  );
}
