import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: string;
  bgColor?: string;
}

export function StatCard({ icon: Icon, label, value, color = 'text-secondary', bgColor = 'bg-secondary-light' }: StatCardProps) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:shadow-md transition-shadow cursor-pointer">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bgColor)}>
        <Icon className={cn('w-5 h-5', color)} />
      </div>
      <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-lg font-bold text-[var(--color-text)]">{value}</span>
    </div>
  );
}
