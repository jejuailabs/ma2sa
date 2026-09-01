import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  bgColor?: string;
}

export function StatCard({ icon: Icon, label, value, sub, color = 'text-primary', bgColor = 'bg-primary-light' }: StatCardProps) {
  return (
    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-4 h-4', color)} />
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-xs text-[var(--color-text-secondary)] mb-0.5">{label}</p>
      <p className="text-xl font-bold text-[var(--color-text)]">{value}</p>
      {sub && <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">{sub}</p>}
    </div>
  );
}
