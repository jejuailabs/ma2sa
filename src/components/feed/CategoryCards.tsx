'use client';

import { Home, Calendar, ShoppingBasket } from 'lucide-react';

const CARDS = [
  {
    icon: Home,
    title: '마을 소식',
    description: '마을들의 다양한 이야기와 소식을 만나보세요',
    color: 'text-primary',
    bg: 'bg-primary-light',
  },
  {
    icon: Calendar,
    title: '이벤트',
    description: '각종 행사와 이벤트 정보를 확인하세요',
    color: 'text-secondary',
    bg: 'bg-secondary-light',
  },
  {
    icon: ShoppingBasket,
    title: '마을 특산품',
    description: '각 마을의 특별한 특산품을 소개합니다',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
  },
];

export function CategoryCards() {
  return (
    <div className="hidden md:grid grid-cols-3 gap-6 mb-10">
      {CARDS.map((card) => (
        <button
          key={card.title}
          className="flex flex-col items-start p-6 rounded-card border border-[var(--color-border)] bg-[var(--color-bg)] hover:shadow-md hover:scale-[1.02] transition-all duration-200 text-left"
        >
          <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center mb-4`}>
            <card.icon className={`w-6 h-6 ${card.color}`} />
          </div>
          <h3 className="font-semibold text-[var(--color-text)] mb-1">{card.title}</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">{card.description}</p>
        </button>
      ))}
    </div>
  );
}
