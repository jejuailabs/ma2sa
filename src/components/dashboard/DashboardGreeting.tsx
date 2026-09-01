'use client';

import { Cloud, Sun } from 'lucide-react';

interface DashboardGreetingProps {
  userName: string;
  userRole: string;
  villageName: string;
}

export function DashboardGreeting({ userName, userRole, villageName }: DashboardGreetingProps) {
  const roleLabel = userRole === 'leader' ? '이장' : userRole === 'secretary' ? '사무장' : '';
  const displayName = roleLabel ? `${userName}${roleLabel}님` : `${userName}님`;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-secondary/90 to-secondary/70 text-white p-6 sm:p-8">
      {/* Background illustration */}
      <div className="absolute right-0 bottom-0 opacity-20">
        <svg width="200" height="120" viewBox="0 0 200 120" fill="none">
          <ellipse cx="140" cy="100" rx="80" ry="30" fill="white" />
          <circle cx="100" cy="50" r="30" fill="white" />
          <circle cx="140" cy="40" r="40" fill="white" />
          <circle cx="70" cy="60" r="25" fill="white" />
        </svg>
      </div>

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-1">{displayName},</h2>
          <p className="text-white/80 text-sm sm:text-base">오늘도 행복한 {villageName}입니다</p>
        </div>
        <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2">
          <Sun className="w-5 h-5" />
          <span className="text-sm font-medium">24°C</span>
        </div>
      </div>
    </div>
  );
}
