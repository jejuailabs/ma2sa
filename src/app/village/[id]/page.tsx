'use client';

import { use, useEffect, useState } from 'react';
import { CheckSquare, ClipboardList, Newspaper, Star, Users, Wallet } from 'lucide-react';
import { Header } from '@/components/common/Header';
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
import { getDashboardData, getVillage } from '@/lib/firebase/firestore';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { MOCK_PHOTOS, MOCK_POSTS, MOCK_STATS, MOCK_TODOS } from '@/lib/mockData';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardStats, Post, VillageDocument } from '@/types/feed';

export default function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [villageName, setVillageName] = useState('내 마을');
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS);
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS.slice(0, 3));
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
    { icon: Newspaper, label: '마을 소식', value: stats.news, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-500/10' },
    { icon: Star, label: '이벤트', value: stats.events, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-500/10' },
    { icon: Users, label: '마을회의', value: stats.meetings, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-500/10' },
    { icon: ClipboardList, label: '마을대장', value: stats.members, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-500/10' },
    { icon: CheckSquare, label: '할일', value: stats.todos, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-500/10' },
    { icon: Wallet, label: '자금현황', value: formatCurrency(stats.balance), color: 'text-secondary', bgColor: 'bg-secondary-light' },
  ];
  const photos = documents.filter((item) => item.type === 'photo' && item.fileURL).map((item) => item.fileURL);

  return (
    <AccessGuard villageId={id} adminOnly>
      <div className="min-h-screen">
        <div className="hidden lg:block"><Header /></div>
        <MobileDashboardHeader villageId={id} villageName={villageName} />
        <div className="flex">
          <SidebarMenu villageId={id} villageName={villageName} balance={stats.balance} />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6 max-w-5xl">
            {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-error text-sm">{error}</div>}
            <div className="mb-6"><DashboardGreeting userName={user?.displayName || '사용자'} userRole={user?.role || 'resident'} villageName={villageName} /></div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">{statCards.map((stat) => <StatCard key={stat.label} {...stat} />)}</div>
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <RecentNews posts={posts} villageId={id} />
              <TodoList initialTodos={isFirebaseConfigured ? [] : MOCK_TODOS} villageId={id} userId={user?.uid} />
            </div>
            <div className="grid lg:grid-cols-2 gap-6"><AIFeatureButton villageId={id} /><PhotoGrid photos={photos.length ? photos : MOCK_PHOTOS} /></div>
          </main>
        </div>
        <BottomTabBar />
      </div>
    </AccessGuard>
  );
}
