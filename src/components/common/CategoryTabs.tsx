'use client';

import { cn } from '@/lib/utils';
import { Home as HomeIcon, Calendar, ShoppingBasket } from 'lucide-react';

export type CategoryTab = 'news' | 'event' | 'product';

interface CategoryTabsProps {
  active: CategoryTab;
  onChange: (tab: CategoryTab) => void;
}

const TABS: { key: CategoryTab; label: string; icon: typeof HomeIcon }[] = [
  { key: 'news', label: '마을 소식', icon: HomeIcon },
  { key: 'event', label: '이벤트', icon: Calendar },
  { key: 'product', label: '마을 특산품', icon: ShoppingBasket },
];

export function CategoryTabs({ active, onChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide px-1 py-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 border',
            active === tab.key
              ? 'bg-primary-light text-primary border-primary/30'
              : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-transparent hover:border-[var(--color-border)]'
          )}
        >
          <tab.icon className="w-5 h-5" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
