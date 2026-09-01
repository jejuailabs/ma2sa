'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { SidebarMenu } from './SidebarMenu';
import { MobileDashboardHeader } from './MobileDashboardHeader';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { AccessGuard } from '@/components/auth/AccessGuard';
import { getVillage } from '@/lib/firebase/firestore';
import { isFirebaseConfigured } from '@/lib/firebase/config';

interface DashboardShellProps {
  villageId: string;
  children: ReactNode;
}

export function DashboardShell({ villageId, children }: DashboardShellProps) {
  const [villageName, setVillageName] = useState('내 마을');

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    getVillage(villageId).then((v) => { if (v) setVillageName(v.name); }).catch(() => {});
  }, [villageId]);

  return (
    <AccessGuard villageId={villageId} adminOnly>
      <div className="min-h-screen flex bg-[var(--color-surface)]">
        <SidebarMenu villageId={villageId} villageName={villageName} />
        <div className="flex-1 flex flex-col min-h-screen">
          <MobileDashboardHeader villageId={villageId} villageName={villageName} />
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6 overflow-auto">
            {children}
          </div>
        </div>
      </div>
      <BottomTabBar />
    </AccessGuard>
  );
}
