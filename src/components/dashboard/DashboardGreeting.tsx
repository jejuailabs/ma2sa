'use client';

import { ROLE_LABELS, isOfficialRole, type UserRole } from '@/types/user';

interface DashboardGreetingProps {
  userName: string;
  userRole: string;
  villageName: string;
}

export function DashboardGreeting({ userName, userRole, villageName }: DashboardGreetingProps) {
  const roleLabel = isOfficialRole(userRole as UserRole) ? ROLE_LABELS[userRole as UserRole] : '';
  const displayName = roleLabel ? `${userName}${roleLabel}님` : `${userName}님`;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '좋은 아침이에요.' : hour < 18 ? '좋은 오후에요.' : '수고하셨습니다.';

  return (
    <div className="mb-8">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-light text-primary text-xs font-medium rounded-full mb-3">
        {villageName} · 맑음 24°C
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] mb-1">
        {displayName}, {greeting}
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        오늘 처리할 일 3건과 새 가입 요청 2건이 있습니다.
      </p>
    </div>
  );
}
